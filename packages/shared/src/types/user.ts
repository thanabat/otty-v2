export interface UserPersonalInfo {
  fullname?: string | null;
  nickname?: string | null;
  basecampName?: string | null;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
}

export interface UserWorkingInfo {
  currentSite?: string | null;
  currentSiteOther?: string | null;
  project?: string | null;
  title?: string | null;
  joiningYear?: number | null;
  referrer?: string | null;
}

export interface UserFieldItem {
  key: string;
  label: string;
  value: string;
}

export interface UserSection {
  key: string;
  title: string;
  items: UserFieldItem[];
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
  sections: UserSection[];
}

export interface UsersListResponse {
  items: UserRecord[];
  total: number;
  limit: number;
}

export interface UserConnectionItem {
  id: string;
  fullname?: string | null;
  nickname?: string | null;
  title?: string | null;
  joiningYear?: number | null;
}

export interface UserConnectionsResponse {
  referrer: string;
  items: UserConnectionItem[];
  total: number;
  limit: number;
}

export interface UserSiteConnectionsResponse {
  site: string;
  items: UserConnectionItem[];
  total: number;
  limit: number;
}

export interface UserYearConnectionsResponse {
  joiningYear: number;
  items: UserConnectionItem[];
  total: number;
  limit: number;
}

export interface UserProfileUpdateInput {
  fullname?: string | null;
  nickname?: string | null;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  title?: string | null;
  joiningYear?: number | null;
}
