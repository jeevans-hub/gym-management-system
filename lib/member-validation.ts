import {
  MEMBER_GENDERS,
  MEMBER_STATUSES,
  type MemberGender,
  type MemberStatus,
} from '@/models/Member';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;

export interface MemberInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: MemberGender;
  dateOfBirth?: Date;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  joiningDate?: Date;
  status?: MemberStatus;
  profileImage?: string;
}

type ValidationResult =
  | { success: true; data: MemberInput }
  | { success: false; errors: string[] };

const editableFields = new Set([
  'firstName', 'lastName', 'email', 'phone', 'gender', 'dateOfBirth', 'address',
  'emergencyContactName', 'emergencyContactPhone', 'joiningDate', 'status', 'profileImage',
]);

function normalizePhone(value: string): string {
  return value.trim().replace(/[\s().-]/g, '');
}

function parseDate(value: unknown, label: string, errors: string[]): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' && !(value instanceof Date)) {
    errors.push(`${label} must be a valid date`);
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    errors.push(`${label} must be a valid date`);
    return undefined;
  }
  return date;
}

export function validateMemberInput(body: unknown, partial = false): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { success: false, errors: ['Request body must be a JSON object'] };
  }

  const source = body as Record<string, unknown>;
  const data: MemberInput = {};
  const errors: string[] = [];

  if (partial && !Object.keys(source).some((field) => editableFields.has(field))) {
    errors.push('At least one editable field is required');
  }

  const stringField = (field: keyof MemberInput, label: string, required = false) => {
    const value = source[field];
    if (value === undefined) {
      if (required && !partial) errors.push(`${label} is required`);
      return;
    }
    if (typeof value !== 'string') {
      errors.push(`${label} must be a string`);
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      if (required || value.length > 0) errors.push(`${label} cannot be empty`);
      return;
    }
    (data as Record<string, unknown>)[field] = trimmed;
  };

  stringField('firstName', 'First name', true);
  stringField('lastName', 'Last name', true);
  stringField('address', 'Address');
  stringField('emergencyContactName', 'Emergency contact name');
  stringField('profileImage', 'Profile image');

  if (source.email !== undefined) {
    if (source.email === null || source.email === '') {
      if (partial) data.email = undefined;
    } else if (typeof source.email !== 'string') {
      errors.push('Email must be a string');
    } else {
      const email = source.email.trim().toLowerCase();
      if (!EMAIL_PATTERN.test(email)) errors.push('Email must be valid');
      else data.email = email;
    }
  }

  const phoneField = (field: 'phone' | 'emergencyContactPhone', label: string, required = false) => {
    const value = source[field];
    if (value === undefined) {
      if (required && !partial) errors.push(`${label} is required`);
      return;
    }
    if (typeof value !== 'string' || !value.trim()) {
      errors.push(`${label} is required`);
      return;
    }
    const phone = normalizePhone(value);
    if (!PHONE_PATTERN.test(phone)) errors.push(`${label} must contain 7 to 15 digits and may start with +`);
    else data[field] = phone;
  };

  phoneField('phone', 'Phone', true);
  phoneField('emergencyContactPhone', 'Emergency contact phone');

  if (source.gender !== undefined) {
    if (source.gender === null || source.gender === '') {
      if (partial) data.gender = undefined;
    } else if (typeof source.gender !== 'string' || !MEMBER_GENDERS.includes(source.gender as MemberGender)) {
      errors.push(`Gender must be one of: ${MEMBER_GENDERS.join(', ')}`);
    } else data.gender = source.gender as MemberGender;
  }

  if (source.status !== undefined) {
    if (typeof source.status !== 'string' || !MEMBER_STATUSES.includes(source.status as MemberStatus)) {
      errors.push(`Status must be one of: ${MEMBER_STATUSES.join(', ')}`);
    } else data.status = source.status as MemberStatus;
  }

  if (source.dateOfBirth !== undefined) data.dateOfBirth = parseDate(source.dateOfBirth, 'Date of birth', errors);
  if (source.joiningDate !== undefined) data.joiningDate = parseDate(source.joiningDate, 'Joining date', errors);

  if (data.dateOfBirth && data.dateOfBirth > new Date()) errors.push('Date of birth cannot be in the future');

  return errors.length ? { success: false, errors } : { success: true, data };
}
