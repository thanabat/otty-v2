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
