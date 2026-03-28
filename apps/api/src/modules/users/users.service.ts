import mongoose from "mongoose";
import type {
  UserProfileUpdateInput,
  UserRecord,
  UsersListResponse
} from "@otty/shared";
import { HttpError } from "../../lib/http-error";
import { UserModel, type UserDocument } from "./users.model";

export async function listUsers(limit: number): Promise<UsersListResponse> {
  const normalizedLimit = Math.min(Math.max(limit, 1), 100);
  const [items, total] = await Promise.all([
    UserModel.find({})
      .sort({ updated_at: -1, created_at: -1, _id: -1 })
      .limit(normalizedLimit)
      .lean<UserDocument[]>(),
    UserModel.countDocuments()
  ]);

  return {
    items: items.map(serializeUser),
    total,
    limit: normalizedLimit
  };
}

export async function getUserById(id: string): Promise<UserRecord> {
  if (!mongoose.isValidObjectId(id)) {
    throw new HttpError({
      statusCode: 400,
      code: "InvalidUserId",
      message: "User id must be a valid MongoDB ObjectId"
    });
  }

  const user = await UserModel.findById(id).lean<UserDocument | null>();

  if (!user) {
    throw new HttpError({
      statusCode: 404,
      code: "UserNotFound",
      message: "User was not found"
    });
  }

  return serializeUser(user);
}

export async function getUserByLineUserId(lineUserId: string) {
  const user = await UserModel.findOne({
    line_user_id: lineUserId
  }).lean<UserDocument | null>();

  if (!user) {
    throw new HttpError({
      statusCode: 404,
      code: "UserNotFound",
      message: "User was not found"
    });
  }

  return serializeUser(user);
}

export async function updateUserByLineUserId(
  lineUserId: string,
  input: UserProfileUpdateInput
) {
  const updates: Record<string, string | number | Date | null> = {
    updated_at: new Date()
  };

  if ("fullname" in input) {
    updates["personal_info.fullname"] = normalizeString(input.fullname);
  }

  if ("nickname" in input) {
    updates["personal_info.nickname"] = normalizeString(input.nickname);
  }

  if ("email" in input) {
    updates["personal_info.email"] = normalizeString(input.email);
  }

  if ("phone" in input) {
    updates["personal_info.phone"] = normalizeString(input.phone);
  }

  if ("bio" in input) {
    updates["personal_info.bio"] = normalizeString(input.bio);
  }

  if ("title" in input) {
    updates["working_info.title"] = normalizeString(input.title);
  }

  if ("joiningYear" in input) {
    updates["working_info.joining_year"] =
      typeof input.joiningYear === "number" ? input.joiningYear : null;
  }

  const user = await UserModel.findOneAndUpdate(
    {
      line_user_id: lineUserId
    },
    {
      $set: updates
    },
    {
      new: true,
      lean: true
    }
  );

  if (!user) {
    throw new HttpError({
      statusCode: 404,
      code: "UserNotFound",
      message: "User was not found"
    });
  }

  return serializeUser(user as UserDocument);
}

function serializeUser(user: UserDocument): UserRecord {
  const sections = buildUserSections(user);

  return {
    id: user._id.toString(),
    lineUserId: user.line_user_id ?? null,
    personalInfo: user.personal_info
      ? {
          fullname: user.personal_info.fullname ?? null,
          nickname: user.personal_info.nickname ?? null,
          basecampName: user.personal_info.basecamp_name ?? null,
          email: user.personal_info.email ?? null,
          phone: user.personal_info.phone ?? null,
          bio: user.personal_info.bio ?? null
        }
      : undefined,
    workingInfo: user.working_info
      ? {
          currentSite: user.working_info.current_site ?? null,
          currentSiteOther: user.working_info.current_site_other ?? null,
          project: user.working_info.project ?? null,
          title: user.working_info.title ?? null,
          joiningYear: user.working_info.joining_year ?? null,
          referrer: user.working_info.referrer ?? null
        }
      : undefined,
    createdAt: user.created_at?.toISOString() ?? null,
    updatedAt: user.updated_at?.toISOString() ?? null,
    isActive: Boolean(user.is_active),
    hasPurchasedTicket: Boolean(user.has_purchased_ticket),
    sections
  };
}

function buildUserSections(user: UserDocument) {
  const sections = [
    createSection("identity", "Identity", {
      id: user._id.toString(),
      line_user_id: user.line_user_id ?? null
    }),
    createSection("personal_info", "Personal Info", user.personal_info),
    createSection("working_info", "Working Info", user.working_info),
    createSection("status", "Status", {
      is_active: user.is_active,
      has_purchased_ticket: user.has_purchased_ticket
    }),
    createSection("timestamps", "Timestamps", {
      created_at: user.created_at?.toISOString() ?? null,
      updated_at: user.updated_at?.toISOString() ?? null
    })
  ].filter((section): section is NonNullable<typeof section> => Boolean(section));

  const handledKeys = new Set([
    "_id",
    "line_user_id",
    "personal_info",
    "working_info",
    "created_at",
    "updated_at",
    "is_active",
    "has_purchased_ticket"
  ]);

  const extras = Object.entries(user as Record<string, unknown>)
    .filter(([key]) => !handledKeys.has(key))
    .map(([key, value]) => createSection(key, toTitleCase(key), value))
    .filter((section): section is NonNullable<typeof section> => Boolean(section));

  return [...sections, ...extras];
}

function createSection(key: string, title: string, value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    const formatted = formatValue(value);

    if (!formatted) {
      return null;
    }

    return {
      key,
      title,
      items: [
        {
          key,
          label: toLabel(key),
          value: formatted
        }
      ]
    };
  }

  const items = Object.entries(value)
    .map(([itemKey, itemValue]) => ({
      key: itemKey,
      label: toLabel(itemKey),
      value: formatValue(itemValue)
    }))
    .filter((item) => item.value);

  if (items.length === 0) {
    return null;
  }

  return {
    key,
    title,
    items
  };
}

function formatValue(value: unknown) {
  if (value == null) {
    return "";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (typeof value === "string") {
    return value.trim();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return JSON.stringify(value);
}

function toLabel(input: string) {
  return input
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toTitleCase(input: string) {
  return toLabel(input);
}

function normalizeString(value: string | null | undefined) {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
