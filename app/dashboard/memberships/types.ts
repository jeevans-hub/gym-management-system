export type PlanStatus = 'active' | 'inactive';
export type MembershipStatus = 'active' | 'expired' | 'cancelled';

export interface MembershipPlanRecord {
  _id: string;
  name: string;
  description?: string;
  durationMonths: number;
  price: number;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PlanFormValues {
  name: string;
  description: string;
  durationMonths: string;
  price: string;
  status: PlanStatus;
}

export interface PlansResponse {
  plans: MembershipPlanRecord[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MembershipRecord {
  _id: string;
  plan: { _id: string; name: string; durationMonths: number };
  startDate: string;
  endDate: string;
  status: MembershipStatus;
  priceAtPurchase: number;
  notes?: string;
  createdAt: string;
}
