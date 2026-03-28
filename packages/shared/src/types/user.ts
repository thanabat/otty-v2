export interface UserPersonalInfo {
  fullname?: string | null;
  nickname?: string | null;
  basecampName?: string | null;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  pictureUrl?: string | null;
}

export interface UserWorkingInfo {
  currentSite?: string | null;
  currentSiteOther?: string | null;
  project?: string | null;
  title?: string | null;
  joiningYear?: number | null;
  referrer?: string | null;
}

export interface UserWorkingExperience {
  id?: string | null;
  site?: string | null;
  project?: string | null;
  startYear?: number | null;
  endYear?: number | null;
  isCurrent: boolean;
}

export interface UserWorkingExperienceInput {
  site: string;
  project: string;
  startYear: number;
  endYear?: number | null;
  isCurrent: boolean;
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
  workingExperiences: UserWorkingExperience[];
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
  currentSite?: string | null;
}

export interface UserConnectionsResponse {
  referrer: string;
  items: UserConnectionItem[];
  total: number;
  limit: number;
  page: number;
  totalPages: number;
}

export interface UserSiteConnectionsResponse {
  site: string;
  items: UserConnectionItem[];
  total: number;
  limit: number;
  page: number;
  totalPages: number;
}

export interface UserYearConnectionsResponse {
  joiningYear: number;
  items: UserConnectionItem[];
  total: number;
  limit: number;
  page: number;
  totalPages: number;
}

export interface UserCurrentSiteOptionsResponse {
  items: string[];
}

export interface UserProfileUpdateInput {
  fullname?: string | null;
  nickname?: string | null;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  title?: string | null;
  joiningYear?: number | null;
  currentSite?: string | null;
}
