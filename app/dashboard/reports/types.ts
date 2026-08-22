export type ReportRangePreset = 'today' | 'this-week' | 'this-month' | 'custom';
export type ReportTab =
  | 'overview'
  | 'members'
  | 'memberships'
  | 'attendance'
  | 'payments'
  | 'outstanding'
  | 'trainers';

export interface ReportRange {
  preset: ReportRangePreset;
  from: string;
  to: string;
  days: number;
  timeZone: 'Asia/Kolkata';
  boundaries: string;
}

export interface OverviewResponse {
  range: ReportRange;
  members: {
    totalMembers: number;
    activeMembers: number;
    inactiveMembers: number;
    newMembersInRange: number;
  };
  memberships: {
    activeMemberships: number;
    expiredMemberships: number;
    cancelledMemberships: number;
    expiringSoon: number;
    expiringSoonWindowDays: number;
  };
  attendance: {
    attendanceCountInRange: number;
    uniqueMembersAttended: number;
    currentlyCheckedIn: number;
  };
  payments: {
    grossPaidInRange: number;
    refundedAmountInRange: number;
    netRevenueInRange: number;
    accountingPolicy: string;
  };
  trainers: {
    totalTrainers: number;
    activeTrainers: number;
    inactiveTrainers: number;
  };
}

export interface TrendsResponse {
  range: ReportRange;
  interval: 'daily' | 'monthly';
  points: Array<{
    bucket: string;
    newMembers: number;
    attendanceCount: number;
    netRevenue: number;
  }>;
  accountingPolicy: string;
}

export interface PaginatedReport<Row, Summary> {
  rows: Row[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  summary: Summary;
  range?: ReportRange;
}

export interface MemberReportRow {
  memberId: string;
  fullName: string;
  phone: string;
  email?: string;
  joiningDate: string;
  status: 'active' | 'inactive';
  currentMembership?: {
    planName?: string;
    startDate: string;
    endDate: string;
    status: 'active';
  };
}

export type MembersReportResponse = PaginatedReport<
  MemberReportRow,
  { active: number; inactive: number }
>;

export interface MembershipReportRow {
  memberId: string;
  memberName: string;
  plan: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
  priceAtPurchase: number;
}

export type MembershipsReportResponse = PaginatedReport<
  MembershipReportRow,
  { active: number; expired: number; cancelled: number; expiringSoon: number; expiringSoonWindowDays: number }
>;

export interface AttendanceReportRow {
  gymDate: string;
  memberId: string;
  memberName: string;
  checkIn: string;
  checkOut?: string;
  status: 'checked-in' | 'checked-out';
}

export type AttendanceReportResponse = PaginatedReport<
  AttendanceReportRow,
  { totalAttendanceRecords: number; uniqueMembers: number; checkedIn: number; checkedOut: number }
>;

export interface PaymentReportRow {
  paymentDate: string;
  memberId: string;
  memberName: string;
  plan: string;
  amount: number;
  method: 'cash' | 'upi' | 'card' | 'bank-transfer' | 'other';
  status: 'paid' | 'refunded';
  transactionReference?: string;
}

export type PaymentsReportResponse = PaginatedReport<
  PaymentReportRow,
  {
    grossPaid: number;
    refundedAmount: number;
    netRevenue: number;
    paymentCount: number;
    paidCount: number;
    refundedCount: number;
    accountingPolicy: string;
  }
>;

export interface OutstandingReportRow {
  memberId: string;
  memberName: string;
  plan: string;
  membershipStatus: 'active' | 'expired' | 'cancelled';
  priceAtPurchase: number;
  totalPaid: number;
  remainingBalance: number;
  endDate: string;
}

export type OutstandingReportResponse = PaginatedReport<
  OutstandingReportRow,
  {
    membershipCount: number;
    totalPrice: number;
    totalPaid: number;
    totalOutstanding: number;
    accountingPolicy: string;
  }
>;

export interface TrainerReportRow {
  trainerId: string;
  name: string;
  phone: string;
  email?: string;
  specialization: string;
  experienceYears: number;
  joiningDate: string;
  status: 'active' | 'inactive';
}

export type TrainersReportResponse = PaginatedReport<
  TrainerReportRow,
  { total: number; active: number; inactive: number }
>;
