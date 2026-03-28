import { z } from "zod";
import type {
  LiffWorkingExperienceCreateRequest,
  LiffWorkingExperienceDeleteRequest,
  LiffWorkingExperienceUpdateRequest,
  LiffLoginResponse,
  UserProfileUpdateInput,
  VerifiedLineProfileResponse
} from "@otty/shared";
import { env } from "../../config/env";
import { HttpError } from "../../lib/http-error";
import {
  createWorkingExperienceByLineUserId,
  deleteWorkingExperienceByLineUserId,
  syncLinePictureByLineUserId,
  updateWorkingExperienceByLineUserId,
  updateUserByLineUserId
} from "../users/users.service";

const lineAccessTokenVerificationSchema = z.object({
  client_id: z.string(),
  expires_in: z.coerce.number().int().nonnegative(),
  scope: z.string().default("")
});

const lineProfileSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  pictureUrl: z.string().url().optional(),
  statusMessage: z.string().optional()
});

export async function getVerifiedLineProfile(
  accessToken: string
): Promise<VerifiedLineProfileResponse> {
  if (!env.LINE_CHANNEL_ID) {
    throw new HttpError({
      statusCode: 500,
      code: "LineChannelIdMissing",
      message: "LINE channel ID is not configured"
    });
  }

  const verificationUrl = new URL("https://api.line.me/oauth2/v2.1/verify");
  verificationUrl.searchParams.set("access_token", accessToken);

  const verification = await fetchLineJson(
    verificationUrl.toString(),
    lineAccessTokenVerificationSchema,
    {
      method: "GET"
    },
    {
      errorCode: "LineAccessTokenInvalid",
      errorMessage: "LINE access token is invalid or expired",
      statusCode: 401
    }
  );

  if (verification.client_id !== env.LINE_CHANNEL_ID) {
    throw new HttpError({
      statusCode: 401,
      code: "LineChannelMismatch",
      message: "LINE access token does not belong to the configured channel"
    });
  }

  const profile = await fetchLineJson(
    "https://api.line.me/v2/profile",
    lineProfileSchema,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    {
      errorCode: "LineProfileFetchFailed",
      errorMessage: "Unable to fetch LINE profile with the provided token",
      statusCode: 401
    }
  );

  return {
    profile,
    token: {
      channelId: verification.client_id,
      expiresIn: verification.expires_in,
      scope: (verification.scope ?? "")
        .split(" ")
        .map((scope) => scope.trim())
        .filter(Boolean)
    }
  };
}

export async function loginWithLiff(
  accessToken: string
): Promise<LiffLoginResponse> {
  const verified = await getVerifiedLineProfile(accessToken);
  const user = await syncLinePictureByLineUserId(
    verified.profile.userId,
    verified.profile.pictureUrl
  );

  return {
    lineProfile: verified.profile,
    token: verified.token,
    user
  };
}

export async function updateProfileWithLiff(
  accessToken: string,
  profileInput: UserProfileUpdateInput
): Promise<LiffLoginResponse> {
  const verified = await getVerifiedLineProfile(accessToken);
  await syncLinePictureByLineUserId(
    verified.profile.userId,
    verified.profile.pictureUrl
  );
  const user = await updateUserByLineUserId(
    verified.profile.userId,
    profileInput
  );

  return {
    lineProfile: verified.profile,
    token: verified.token,
    user
  };
}

export async function createWorkingExperienceWithLiff(
  accessToken: string,
  body: LiffWorkingExperienceCreateRequest["experience"]
) {
  const verified = await getVerifiedLineProfile(accessToken);

  return createWorkingExperienceByLineUserId(verified.profile.userId, body);
}

export async function updateWorkingExperienceWithLiff(
  accessToken: string,
  experienceId: LiffWorkingExperienceUpdateRequest["experienceId"],
  body: LiffWorkingExperienceUpdateRequest["experience"]
) {
  const verified = await getVerifiedLineProfile(accessToken);

  return updateWorkingExperienceByLineUserId(
    verified.profile.userId,
    experienceId,
    body
  );
}

export async function deleteWorkingExperienceWithLiff(
  accessToken: string,
  experienceId: LiffWorkingExperienceDeleteRequest["experienceId"]
) {
  const verified = await getVerifiedLineProfile(accessToken);

  return deleteWorkingExperienceByLineUserId(verified.profile.userId, experienceId);
}

async function fetchLineJson<T>(
  input: string,
  schema: z.ZodSchema<T>,
  init: RequestInit,
  errorOptions: {
    errorCode: string;
    errorMessage: string;
    statusCode: number;
  }
) {
  let response: Response;

  try {
    response = await fetch(input, init);
  } catch (error) {
    throw new HttpError({
      statusCode: 502,
      code: "LineApiUnavailable",
      message: "LINE API is unavailable",
      details: error instanceof Error ? error.message : "Unknown network error"
    });
  }

  if (!response.ok) {
    throw new HttpError({
      statusCode: errorOptions.statusCode,
      code: errorOptions.errorCode,
      message: errorOptions.errorMessage,
      details: {
        lineStatus: response.status
      }
    });
  }

  return schema.parse(await response.json());
}
