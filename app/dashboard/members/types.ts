export type MemberStatus = 'active' | 'inactive';

export interface MemberListItem {
  memberId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  joiningDate: string;
  status: MemberStatus;
}

export interface MembersResponse {
  members: MemberListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type StatusFilter = 'all' | MemberStatus;
