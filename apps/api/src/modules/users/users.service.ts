import mongoose from "mongoose";
import type {
  UserConnectionsResponse,
  UserReferrerCandidate,
  UserReferrerCandidatesResponse,
  UserCurrentSiteOptionsResponse,
  UserReferrerSummary,
  UserReferrerOptionsResponse,
  UserWorkingExperienceInput,
  UserSiteConnectionsResponse,
  UserYearConnectionsResponse,
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

export async function syncLinePictureByLineUserId(
  lineUserId: string,
  pictureUrl?: string | null
) {
  const user = await UserModel.findOneAndUpdate(
    {
      line_user_id: lineUserId
    },
    {
      $set: {
        "personal_info.picture_url": normalizeString(pictureUrl),
        updated_at: new Date()
      }
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

export async function listCurrentSiteOptions(): Promise<UserCurrentSiteOptionsResponse> {
  const [sites, siteOthers] = await Promise.all([
    UserModel.distinct("working_info.current_site"),
    UserModel.distinct("working_info.current_site_other")
  ]);

  const items = [...sites, ...siteOthers]
    .map((value) =>
      typeof value === "string" ? normalizeCurrentSite(value) ?? "" : ""
    )
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .sort((left, right) => left.localeCompare(right));

  return {
    items
  };
}

export async function listReferrerOptions(): Promise<UserReferrerOptionsResponse> {
  const referrers = await UserModel.distinct("working_info.referrer");
  const items = uniqueNormalizedStringValues(referrers).sort((left, right) =>
    left.localeCompare(right)
  );

  return {
    items
  };
}

export async function listReferrerCandidates(): Promise<UserReferrerCandidatesResponse> {
  const users = await UserModel.find(
    {
      $or: [
        { "personal_info.nickname": { $exists: true, $ne: null } },
        { "personal_info.fullname": { $exists: true, $ne: null } }
      ]
    },
    {
      _id: 1,
      "personal_info.nickname": 1,
      "personal_info.fullname": 1
    }
  )
    .sort({ "personal_info.nickname": 1, "personal_info.fullname": 1, _id: 1 })
    .lean<
      Array<{
        _id: mongoose.Types.ObjectId;
        personal_info?: {
          nickname?: string | null;
          fullname?: string | null;
        };
      }>
    >();

  const items = users
    .map((user) => serializeReferrerCandidate(user))
    .filter((item): item is UserReferrerCandidate => Boolean(item));

  return {
    items
  };
}

export async function getReferrerSummary(
  _referrer: string,
  referrerUserId?: string | null
): Promise<UserReferrerSummary | null> {
  const normalizedReferrerUserId = normalizeObjectIdString(referrerUserId);

  if (!normalizedReferrerUserId) {
    return null;
  }

  const referrerUser = await UserModel.findById(
    normalizedReferrerUserId,
    {
      _id: 1,
      "personal_info.fullname": 1,
      "working_info.title": 1
    }
  )
    .lean<
      | {
          _id: mongoose.Types.ObjectId;
          personal_info?: {
            fullname?: string | null;
          };
          working_info?: {
            title?: string | null;
          };
        }
      | null
      | null
    >();

  if (!referrerUser) {
    return null;
  }

  return {
    id: referrerUser._id.toString(),
    fullname: referrerUser.personal_info?.fullname ?? null,
    title: referrerUser.working_info?.title ?? null
  };
}

export async function listUsersByReferrer(
  referrer: string,
  limit: number,
  page: number,
  referrerUserId?: string | null
): Promise<UserConnectionsResponse> {
  const normalizedReferrer = referrer.trim();

  if (!normalizedReferrer) {
    throw new HttpError({
      statusCode: 400,
      code: "InvalidReferrer",
      message: "Referrer must not be empty"
    });
  }

  const normalizedLimit = Math.min(Math.max(limit, 1), 100);
  const normalizedPage = Math.max(page, 1);
  const skip = (normalizedPage - 1) * normalizedLimit;
  const referrerRegex = new RegExp(`^${escapeRegex(normalizedReferrer)}$`, "i");
  const normalizedReferrerUserId = normalizeObjectIdString(referrerUserId);
  const projection = {
    _id: 1,
    "personal_info.fullname": 1,
    "personal_info.nickname": 1,
    "working_info.title": 1,
    "working_info.joining_year": 1,
    "working_info.current_site": 1,
    "working_info.current_site_other": 1
  } as const;
  let resolvedReferrerLabel = normalizedReferrer;
  let filter: Record<string, unknown> = {
    "working_info.referrer": referrerRegex
  };

  if (normalizedReferrerUserId) {
    filter = {
      "working_info.referrer_user_id": normalizedReferrerUserId
    };

    const referrerUser = await UserModel.findById(
      normalizedReferrerUserId,
      {
        "personal_info.nickname": 1,
        "personal_info.fullname": 1
      }
    ).lean<
      | {
          personal_info?: {
            nickname?: string | null;
            fullname?: string | null;
          };
        }
      | null
    >();

    if (referrerUser) {
      resolvedReferrerLabel =
        buildReferrerSnapshot(referrerUser.personal_info) ??
        extractShortName(referrerUser.personal_info?.fullname) ??
        resolvedReferrerLabel;
    }
  }

  const [items, total] = await Promise.all([
    UserModel.find(filter, projection)
      .sort({ "personal_info.fullname": 1, _id: 1 })
      .skip(skip)
      .limit(normalizedLimit)
      .lean<
        Array<{
          _id: mongoose.Types.ObjectId;
          personal_info?: {
            fullname?: string | null;
            nickname?: string | null;
          };
          working_info?: {
            title?: string | null;
            joining_year?: number | null;
            current_site?: string | null;
            current_site_other?: string | null;
          };
        }>
      >(),
    UserModel.countDocuments(filter)
  ]);

  return {
    referrer: resolvedReferrerLabel,
    items: items.map((user) => ({
      id: user._id.toString(),
      fullname: user.personal_info?.fullname ?? null,
      nickname: user.personal_info?.nickname ?? null,
      title: user.working_info?.title ?? null,
      joiningYear: user.working_info?.joining_year ?? null,
      currentSite:
        user.working_info?.current_site ??
        user.working_info?.current_site_other ??
        null
    })),
    total,
    limit: normalizedLimit,
    page: normalizedPage,
    totalPages: Math.max(Math.ceil(total / normalizedLimit), 1)
  };
}

export async function listUsersByCurrentSite(
  site: string,
  limit: number,
  page: number
): Promise<UserSiteConnectionsResponse> {
  const normalizedSite = site.trim();

  if (!normalizedSite) {
    throw new HttpError({
      statusCode: 400,
      code: "InvalidCurrentSite",
      message: "Current site must not be empty"
    });
  }

  const normalizedLimit = Math.min(Math.max(limit, 1), 100);
  const normalizedPage = Math.max(page, 1);
  const skip = (normalizedPage - 1) * normalizedLimit;
  const siteRegex = new RegExp(`^${escapeRegex(normalizedSite)}$`, "i");
  const projection = {
    _id: 1,
    "personal_info.fullname": 1,
    "personal_info.nickname": 1,
    "working_info.title": 1,
    "working_info.joining_year": 1,
    "working_info.current_site": 1,
    "working_info.current_site_other": 1
  } as const;

  const filter = {
    $or: [
      {
        "working_info.current_site": siteRegex
      },
      {
        "working_info.current_site_other": siteRegex
      }
    ]
  };

  const [items, total] = await Promise.all([
    UserModel.find(filter, projection)
      .sort({ "personal_info.fullname": 1, _id: 1 })
      .skip(skip)
      .limit(normalizedLimit)
      .lean<
        Array<{
          _id: mongoose.Types.ObjectId;
          personal_info?: {
            fullname?: string | null;
            nickname?: string | null;
          };
          working_info?: {
            title?: string | null;
            joining_year?: number | null;
            current_site?: string | null;
            current_site_other?: string | null;
          };
        }>
      >(),
    UserModel.countDocuments(filter)
  ]);

  return {
    site: normalizedSite,
    items: items.map((user) => ({
      id: user._id.toString(),
      fullname: user.personal_info?.fullname ?? null,
      nickname: user.personal_info?.nickname ?? null,
      title: user.working_info?.title ?? null,
      joiningYear: user.working_info?.joining_year ?? null,
      currentSite:
        user.working_info?.current_site ??
        user.working_info?.current_site_other ??
        null
    })),
    total,
    limit: normalizedLimit,
    page: normalizedPage,
    totalPages: Math.max(Math.ceil(total / normalizedLimit), 1)
  };
}

export async function listUsersByJoiningYear(
  joiningYear: number,
  limit: number,
  page: number
): Promise<UserYearConnectionsResponse> {
  if (!Number.isInteger(joiningYear) || joiningYear < 1900 || joiningYear > 3000) {
    throw new HttpError({
      statusCode: 400,
      code: "InvalidJoiningYear",
      message: "Joining year must be a valid year"
    });
  }

  const normalizedLimit = Math.min(Math.max(limit, 1), 100);
  const normalizedPage = Math.max(page, 1);
  const skip = (normalizedPage - 1) * normalizedLimit;
  const projection = {
    _id: 1,
    "personal_info.fullname": 1,
    "personal_info.nickname": 1,
    "working_info.title": 1,
    "working_info.joining_year": 1,
    "working_info.current_site": 1,
    "working_info.current_site_other": 1
  } as const;

  const [items, total] = await Promise.all([
    UserModel.find(
      {
        "working_info.joining_year": joiningYear
      },
      projection
    )
      .sort({ "personal_info.fullname": 1, _id: 1 })
      .skip(skip)
      .limit(normalizedLimit)
      .lean<
        Array<{
          _id: mongoose.Types.ObjectId;
          personal_info?: {
            fullname?: string | null;
            nickname?: string | null;
          };
          working_info?: {
            title?: string | null;
            joining_year?: number | null;
            current_site?: string | null;
            current_site_other?: string | null;
          };
        }>
      >(),
    UserModel.countDocuments({
      "working_info.joining_year": joiningYear
    })
  ]);

  return {
    joiningYear,
    items: items.map((user) => ({
      id: user._id.toString(),
      fullname: user.personal_info?.fullname ?? null,
      nickname: user.personal_info?.nickname ?? null,
      title: user.working_info?.title ?? null,
      joiningYear: user.working_info?.joining_year ?? null,
      currentSite:
        user.working_info?.current_site ??
        user.working_info?.current_site_other ??
        null
    })),
    total,
    limit: normalizedLimit,
    page: normalizedPage,
    totalPages: Math.max(Math.ceil(total / normalizedLimit), 1)
  };
}

export async function updateUserByLineUserId(
  lineUserId: string,
  input: UserProfileUpdateInput
) {
  const updates: Record<string, string | number | Date | null> = {
    updated_at: new Date()
  };
  const hasReferrerUserIdInput = "referrerUserId" in input;
  const normalizedReferrerUserId = hasReferrerUserIdInput
    ? normalizeObjectIdString(input.referrerUserId)
    : undefined;

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

  if (hasReferrerUserIdInput && input.referrerUserId && !normalizedReferrerUserId) {
    throw new HttpError({
      statusCode: 400,
      code: "InvalidReferrerUserId",
      message: "Referrer user id must be a valid MongoDB ObjectId"
    });
  }

  if (normalizedReferrerUserId) {
    const referrerUser = await UserModel.findById(
      normalizedReferrerUserId,
      {
        "personal_info.nickname": 1,
        "personal_info.fullname": 1
      }
    ).lean<
      | {
          personal_info?: {
            nickname?: string | null;
            fullname?: string | null;
          };
        }
      | null
    >();

    if (!referrerUser) {
      throw new HttpError({
        statusCode: 404,
        code: "ReferrerUserNotFound",
        message: "Selected referrer user was not found"
      });
    }

    updates["working_info.referrer_user_id"] = normalizedReferrerUserId;
    updates["working_info.referrer"] =
      buildReferrerSnapshot(referrerUser.personal_info) ?? null;
  } else {
    if ("referrer" in input) {
      updates["working_info.referrer"] = normalizeString(input.referrer);
    }

    if (hasReferrerUserIdInput) {
      updates["working_info.referrer_user_id"] = null;
    }
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

export async function createWorkingExperienceByLineUserId(
  lineUserId: string,
  input: UserWorkingExperienceInput
) {
  const user = await UserModel.findOne({
    line_user_id: lineUserId
  });

  if (!user) {
    throw new HttpError({
      statusCode: 404,
      code: "UserNotFound",
      message: "User was not found"
    });
  }

  const nextExperience = {
    _id: new mongoose.Types.ObjectId(),
    ...normalizeWorkingExperienceInput(input)
  };

  let experiences = readWorkingExperiences(user).map((experience) => ({
    ...experience
  }));

  if (nextExperience.is_current) {
    experiences = experiences.map((experience) => ({
      ...experience,
      is_current: false
    }));
  }

  experiences.push(nextExperience);
  applyWorkingExperiences(user, experiences);

  return saveAndSerializeUser(user);
}

export async function updateWorkingExperienceByLineUserId(
  lineUserId: string,
  experienceId: string,
  input: UserWorkingExperienceInput
) {
  assertWorkingExperienceId(experienceId);

  const user = await UserModel.findOne({
    line_user_id: lineUserId
  });

  if (!user) {
    throw new HttpError({
      statusCode: 404,
      code: "UserNotFound",
      message: "User was not found"
    });
  }

  const normalizedInput = normalizeWorkingExperienceInput(input);
  const experiences = readWorkingExperiences(user).map((experience) => ({
    ...experience
  }));
  const existingIndex = experiences.findIndex(
    (experience) => experience._id.toString() === experienceId
  );

  if (existingIndex < 0) {
    throw new HttpError({
      statusCode: 404,
      code: "WorkingExperienceNotFound",
      message: "Working experience was not found"
    });
  }

  if (normalizedInput.is_current) {
    for (const experience of experiences) {
      experience.is_current = false;
    }
  }

  const existingExperience = experiences[existingIndex];

  if (!existingExperience) {
    throw new HttpError({
      statusCode: 404,
      code: "WorkingExperienceNotFound",
      message: "Working experience was not found"
    });
  }

  experiences[existingIndex] = {
    _id: existingExperience._id,
    ...normalizedInput
  };

  applyWorkingExperiences(user, experiences);

  return saveAndSerializeUser(user);
}

export async function deleteWorkingExperienceByLineUserId(
  lineUserId: string,
  experienceId: string
) {
  assertWorkingExperienceId(experienceId);

  const user = await UserModel.findOne({
    line_user_id: lineUserId
  });

  if (!user) {
    throw new HttpError({
      statusCode: 404,
      code: "UserNotFound",
      message: "User was not found"
    });
  }

  const experiences = readWorkingExperiences(user).filter(
    (experience) => experience._id.toString() !== experienceId
  );

  if (experiences.length === readWorkingExperiences(user).length) {
    throw new HttpError({
      statusCode: 404,
      code: "WorkingExperienceNotFound",
      message: "Working experience was not found"
    });
  }

  applyWorkingExperiences(user, experiences);

  return saveAndSerializeUser(user);
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
          bio: user.personal_info.bio ?? null,
          pictureUrl: user.personal_info.picture_url ?? null
        }
      : undefined,
    workingInfo: user.working_info
      ? {
          currentSite: user.working_info.current_site ?? null,
          currentSiteOther: user.working_info.current_site_other ?? null,
          project: user.working_info.project ?? null,
          title: user.working_info.title ?? null,
          joiningYear: user.working_info.joining_year ?? null,
          referrer: user.working_info.referrer ?? null,
          referrerUserId: user.working_info.referrer_user_id ?? null
        }
      : undefined,
    workingExperiences: Array.isArray(user.working_experiences)
      ? user.working_experiences.map((experience) => ({
          id:
            experience && typeof experience === "object" && "_id" in experience
              ? String(experience._id)
              : null,
          site:
            experience && typeof experience === "object" && "site" in experience
              ? normalizeString(experience.site as string | null | undefined)
              : null,
          project:
            experience &&
            typeof experience === "object" &&
            "project" in experience
              ? normalizeString(experience.project as string | null | undefined)
              : null,
          startYear:
            experience &&
            typeof experience === "object" &&
            "start_year" in experience &&
            typeof experience.start_year === "number"
              ? experience.start_year
              : null,
          endYear:
            experience &&
            typeof experience === "object" &&
            "end_year" in experience &&
            typeof experience.end_year === "number"
              ? experience.end_year
              : null,
          isCurrent:
            experience &&
            typeof experience === "object" &&
            "is_current" in experience
              ? Boolean(experience.is_current)
              : false
        }))
      : [],
    createdAt: user.created_at?.toISOString() ?? null,
    updatedAt: user.updated_at?.toISOString() ?? null,
    isActive: Boolean(user.is_active),
    hasPurchasedTicket: Boolean(user.has_purchased_ticket),
    sections
  };
}

function serializeReferrerCandidate(user: {
  _id: mongoose.Types.ObjectId;
  personal_info?: {
    nickname?: string | null;
    fullname?: string | null;
  };
}): UserReferrerCandidate | null {
  const nickname = normalizeString(user.personal_info?.nickname);
  const fullname = normalizeString(user.personal_info?.fullname);
  const shortName = extractShortName(fullname);

  if (!nickname && !fullname) {
    return null;
  }

  return {
    id: user._id.toString(),
    nickname,
    fullname,
    shortName
  };
}

function buildReferrerSnapshot(personalInfo?: {
  nickname?: string | null;
  fullname?: string | null;
}) {
  return (
    normalizeString(personalInfo?.nickname) ??
    extractShortName(personalInfo?.fullname) ??
    normalizeString(personalInfo?.fullname)
  );
}

function extractShortName(value?: string | null) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  const [firstPart] = normalized.split(/\s+/);
  return firstPart ?? normalized;
}

function normalizeObjectIdString(value?: string | null) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  return mongoose.isValidObjectId(normalized) ? normalized : null;
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
    "working_experiences",
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

function normalizeCurrentSite(value: string | null | undefined) {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  return normalized.toUpperCase();
}

function uniqueNormalizedStringValues(values: unknown[]) {
  const seen = new Set<string>();
  const items: string[] = [];

  for (const value of values) {
    const normalized = normalizeString(
      typeof value === "string" ? value : null
    );

    if (!normalized) {
      continue;
    }

    const dedupeKey = normalized.toLowerCase();

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    items.push(normalized);
  }

  return items;
}

function normalizeWorkingExperienceInput(input: UserWorkingExperienceInput) {
  const site = normalizeCurrentSite(input.site);
  const project = normalizeString(input.project);
  const startYear = normalizeExperienceYear(input.startYear, "Start year");
  const isCurrent = Boolean(input.isCurrent);
  const endYear = isCurrent
    ? null
    : input.endYear == null
      ? null
      : normalizeExperienceYear(input.endYear, "End year");

  if (!site) {
    throw new HttpError({
      statusCode: 400,
      code: "WorkingExperienceSiteRequired",
      message: "Working experience site is required"
    });
  }

  if (!project) {
    throw new HttpError({
      statusCode: 400,
      code: "WorkingExperienceProjectRequired",
      message: "Working experience project is required"
    });
  }

  if (endYear != null && endYear < startYear) {
    throw new HttpError({
      statusCode: 400,
      code: "WorkingExperienceYearRangeInvalid",
      message: "End year must be greater than or equal to start year"
    });
  }

  return {
    site,
    project,
    start_year: startYear,
    end_year: endYear,
    is_current: isCurrent
  };
}

function normalizeExperienceYear(value: number, label: string) {
  if (!Number.isInteger(value) || value < 1900 || value > 3000) {
    throw new HttpError({
      statusCode: 400,
      code: "WorkingExperienceYearInvalid",
      message: `${label} must be a valid year`
    });
  }

  return value;
}

function assertWorkingExperienceId(experienceId: string) {
  if (!mongoose.isValidObjectId(experienceId)) {
    throw new HttpError({
      statusCode: 400,
      code: "InvalidWorkingExperienceId",
      message: "Working experience id must be a valid MongoDB ObjectId"
    });
  }
}

function readWorkingExperiences(user: InstanceType<typeof UserModel>) {
  const rawValue = user.get("working_experiences");

  if (!Array.isArray(rawValue)) {
    return [] as Array<{
      _id: mongoose.Types.ObjectId;
      site: string | null;
      project: string | null;
      start_year: number | null;
      end_year: number | null;
      is_current: boolean;
    }>;
  }

  return rawValue
    .map((experience) => {
      if (!experience || typeof experience !== "object") {
        return null;
      }

      const record = experience as Record<string, unknown>;
      const objectId =
        record._id instanceof mongoose.Types.ObjectId
          ? record._id
          : typeof record._id === "string" && mongoose.isValidObjectId(record._id)
            ? new mongoose.Types.ObjectId(record._id)
            : null;

      if (!objectId) {
        return null;
      }

      return {
        _id: objectId,
        site: normalizeCurrentSite(
          typeof record.site === "string" ? record.site : null
        ),
        project: normalizeString(
          typeof record.project === "string" ? record.project : null
        ),
        start_year:
          typeof record.start_year === "number" && Number.isInteger(record.start_year)
            ? record.start_year
            : null,
        end_year:
          typeof record.end_year === "number" && Number.isInteger(record.end_year)
            ? record.end_year
            : null,
        is_current: Boolean(record.is_current)
      };
    })
    .filter(
      (
        experience
      ): experience is {
        _id: mongoose.Types.ObjectId;
        site: string | null;
        project: string | null;
        start_year: number | null;
        end_year: number | null;
        is_current: boolean;
      } => Boolean(experience)
    );
}

function applyWorkingExperiences(
  user: InstanceType<typeof UserModel>,
  experiences: Array<{
    _id: mongoose.Types.ObjectId;
    site: string | null;
    project: string | null;
    start_year: number | null;
    end_year: number | null;
    is_current: boolean;
  }>
) {
  user.set("working_experiences", experiences);
  syncWorkingInfoFromExperiences(user, experiences);
  user.set("updated_at", new Date());
  user.markModified("working_experiences");
  user.markModified("working_info");
}

function syncWorkingInfoFromExperiences(
  user: InstanceType<typeof UserModel>,
  experiences: Array<{
    _id: mongoose.Types.ObjectId;
    site: string | null;
    project: string | null;
    start_year: number | null;
    end_year: number | null;
    is_current: boolean;
  }>
) {
  const currentExperience =
    experiences.find((experience) => experience.is_current) ?? null;

  user.set("working_info.current_site", currentExperience?.site ?? null);
  user.set("working_info.current_site_other", null);
  user.set("working_info.project", currentExperience?.project ?? null);
}

async function saveAndSerializeUser(user: InstanceType<typeof UserModel>) {
  await user.save();

  const persistedUser = await UserModel.findById(user._id).lean<UserDocument | null>();

  if (!persistedUser) {
    throw new HttpError({
      statusCode: 404,
      code: "UserNotFound",
      message: "User was not found"
    });
  }

  return serializeUser(persistedUser);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
