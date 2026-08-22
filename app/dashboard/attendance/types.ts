export type AttendanceStatus = 'checked-in' | 'checked-out';

export interface AttendanceMember {
  memberId: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface AttendanceRecord {
  _id: string;
  member: AttendanceMember;
  checkInAt: string;
  checkOutAt?: string;
  attendanceDate: string;
  status: AttendanceStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceResponse {
  attendance: AttendanceRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MemberSearchRecord extends AttendanceMember {
  email?: string;
  status: 'active' | 'inactive';
}

export interface MemberSearchResponse {
  members: MemberSearchRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MembershipSummary {
  status: 'active' | 'expired' | 'cancelled';
  endDate: string;
  plan: { name: string; durationMonths: number };
}

export interface MemberMembershipResponse {
  currentMembership: MembershipSummary | null;
  memberships: MembershipSummary[];
}
