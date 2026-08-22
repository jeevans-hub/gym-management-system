export interface GymSettingsValues {
  gymName: string;
  logo: string;
  address: string;
  phone: string;
  email: string;
  currency: 'INR';
  timezone: 'Asia/Kolkata';
  openingTime: string;
  closingTime: string;
  membershipExpiryWarningDays: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  createdAt: string;
  updatedAt: string;
}

export interface AdminUsersResponse {
  users: AdminUser[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type AdminUserDialogMode = 'view' | 'create' | 'edit';
