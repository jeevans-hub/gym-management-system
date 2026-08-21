export type MemberStatus = 'active' | 'inactive';
export type MemberGender = 'male' | 'female' | 'other' | 'prefer-not-to-say';

export interface MemberListItem {
  memberId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  joiningDate: string;
  status: MemberStatus;
}

export interface MemberRecord extends MemberListItem {
  gender?: MemberGender;
  dateOfBirth?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: '' | MemberGender;
  dateOfBirth: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  joiningDate: string;
  status: MemberStatus;
  profileImage: string;
}

export interface MembersResponse {
  members: MemberListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type StatusFilter = 'all' | MemberStatus;
