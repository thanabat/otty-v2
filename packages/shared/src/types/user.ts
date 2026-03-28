export interface UserPersonalInfo {
  fullname?: string | null;
  nickname?: string | null;
  basecampName?: string | null;
  email?: string | null;
}

export interface UserWorkingInfo {
  currentSite?: string | null;
  currentSiteOther?: string | null;
  project?: string | null;
  joiningYear?: number | null;
  referrer?: string | null;
}

export interface UserRecord {
  id: string;
  lineUserId?: string | null;
  personalInfo?: UserPersonalInfo;
  workingInfo?: UserWorkingInfo;
  createdAt?: string | null;
  updatedAt?: string | null;
  isActive: boolean;
  hasPurchasedTicket: boolean;
}

export interface UsersListResponse {
  items: UserRecord[];
  total: number;
  limit: number;
}
