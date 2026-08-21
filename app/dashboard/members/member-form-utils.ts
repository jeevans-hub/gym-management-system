import type { MemberFormValues, MemberRecord } from './types';

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

export function emptyMemberFormValues(): MemberFormValues {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    joiningDate: todayInput(),
    status: 'active',
    profileImage: '',
  };
}

export function memberToFormValues(member: MemberRecord): MemberFormValues {
  return {
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email ?? '',
    phone: member.phone,
    gender: member.gender ?? '',
    dateOfBirth: toDateInput(member.dateOfBirth),
    address: member.address ?? '',
    emergencyContactName: member.emergencyContactName ?? '',
    emergencyContactPhone: member.emergencyContactPhone ?? '',
    joiningDate: toDateInput(member.joiningDate),
    status: member.status,
    profileImage: member.profileImage ?? '',
  };
}
