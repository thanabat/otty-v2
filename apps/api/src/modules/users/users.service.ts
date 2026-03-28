import mongoose from "mongoose";
import type { UserRecord, UsersListResponse } from "@otty/shared";
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

function serializeUser(user: UserDocument): UserRecord {
  return {
    id: user._id.toString(),
    lineUserId: user.line_user_id ?? null,
    personalInfo: user.personal_info
      ? {
          fullname: user.personal_info.fullname ?? null,
          nickname: user.personal_info.nickname ?? null,
          basecampName: user.personal_info.basecamp_name ?? null,
          email: user.personal_info.email ?? null
        }
      : undefined,
    workingInfo: user.working_info
      ? {
          currentSite: user.working_info.current_site ?? null,
          currentSiteOther: user.working_info.current_site_other ?? null,
          project: user.working_info.project ?? null,
          joiningYear: user.working_info.joining_year ?? null,
          referrer: user.working_info.referrer ?? null
        }
      : undefined,
    createdAt: user.created_at?.toISOString() ?? null,
    updatedAt: user.updated_at?.toISOString() ?? null,
    isActive: Boolean(user.is_active),
    hasPurchasedTicket: Boolean(user.has_purchased_ticket)
  };
}
