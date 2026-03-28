import type {
  UserProfileUpdateInput,
  UserRecord,
  UserWorkingExperienceInput
} from "./user";

export interface LineProfileRequest {
  accessToken: string;
}

export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface VerifiedLineProfileResponse {
  profile: LineUserProfile;
  token: {
    channelId: string;
    expiresIn: number;
    scope: string[];
  };
}

export interface LiffLoginResponse {
  lineProfile: LineUserProfile;
  token: {
    channelId: string;
    expiresIn: number;
    scope: string[];
  };
  user: UserRecord;
}

export interface LiffProfileUpdateRequest extends LineProfileRequest {
  profile: UserProfileUpdateInput;
}

export interface LiffWorkingExperienceCreateRequest extends LineProfileRequest {
  experience: UserWorkingExperienceInput;
}

export interface LiffWorkingExperienceUpdateRequest extends LineProfileRequest {
  experienceId: string;
  experience: UserWorkingExperienceInput;
}

export interface LiffWorkingExperienceDeleteRequest extends LineProfileRequest {
  experienceId: string;
}
