export type TrainerStatus = 'active' | 'inactive';
export type TrainerGender = 'male' | 'female' | 'other' | 'prefer-not-to-say';

export interface TrainerListItem {
  _id: string;
  trainerId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  gender?: TrainerGender;
  specialization: string;
  experienceYears: number;
  joiningDate: string;
  salary?: number;
  status: TrainerStatus;
}

export interface TrainerRecord extends TrainerListItem {
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  profileImage?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainerFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: '' | TrainerGender;
  specialization: string;
  experienceYears: string;
  joiningDate: string;
  salary: string;
  status: TrainerStatus;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  profileImage: string;
  notes: string;
}

export interface TrainersResponse {
  trainers: TrainerListItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type TrainerStatusFilter = 'all' | TrainerStatus;
