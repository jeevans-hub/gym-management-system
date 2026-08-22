export type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank-transfer' | 'other';
export type PaymentStatus = 'paid' | 'refunded';

export interface PaymentMember {
  memberId: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface PaymentPlan {
  name: string;
  durationMonths: number;
  status?: 'active' | 'inactive';
}

export interface PaymentMembership {
  _id: string;
  plan: PaymentPlan;
  startDate: string;
  endDate: string;
  priceAtPurchase: number;
  status: 'active' | 'expired' | 'cancelled';
}

export interface PaymentRecord {
  _id: string;
  member: PaymentMember;
  membership: PaymentMembership;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionReference?: string;
  notes?: string;
  recordedBy: { name: string; email?: string; role: string };
  createdAt: string;
  updatedAt: string;
}

export interface PaymentsResponse {
  payments: PaymentRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaymentTotals {
  totalPaid: number;
  remainingBalance: number;
}

export interface PaymentDetailResponse {
  payment: PaymentRecord;
  totals: PaymentTotals;
}

export interface MembershipPaymentSummary extends PaymentTotals {
  membership: PaymentMembership & { member: PaymentMember };
  payments: Array<Pick<PaymentRecord, '_id' | 'amount' | 'status' | 'paymentDate'>>;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaymentMemberSearchRecord extends PaymentMember {
  _id: string;
  email?: string;
  status: 'active' | 'inactive';
}

export interface PaymentMemberSearchResponse {
  members: PaymentMemberSearchRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
