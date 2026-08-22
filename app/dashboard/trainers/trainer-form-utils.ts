import type { TrainerFormValues, TrainerRecord } from './types';

function toDateInput(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function todayInput(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function emptyTrainerFormValues(): TrainerFormValues {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    specialization: '',
    experienceYears: '0',
    joiningDate: todayInput(),
    salary: '',
    status: 'active',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    profileImage: '',
    notes: '',
  };
}

export function trainerToFormValues(trainer: TrainerRecord): TrainerFormValues {
  return {
    firstName: trainer.firstName,
    lastName: trainer.lastName,
    email: trainer.email ?? '',
    phone: trainer.phone,
    gender: trainer.gender ?? '',
    specialization: trainer.specialization,
    experienceYears: String(trainer.experienceYears),
    joiningDate: toDateInput(trainer.joiningDate),
    salary: trainer.salary === undefined ? '' : String(trainer.salary),
    status: trainer.status,
    address: trainer.address ?? '',
    emergencyContactName: trainer.emergencyContactName ?? '',
    emergencyContactPhone: trainer.emergencyContactPhone ?? '',
    profileImage: trainer.profileImage ?? '',
    notes: trainer.notes ?? '',
  };
}
