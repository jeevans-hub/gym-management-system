import {
  TRAINER_GENDERS,
  TRAINER_STATUSES,
  type TrainerGender,
  type TrainerStatus,
} from '@/models/Trainer';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const PROFILE_IMAGE_PATTERN = /^(?:https?:\/\/|\/{1,2}|\.{1,2}\/)/i;
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 100;
const MAX_SPECIALIZATION_LENGTH = 100;
const MAX_ADDRESS_LENGTH = 500;
const MAX_PROFILE_IMAGE_LENGTH = 2048;
const MAX_NOTES_LENGTH = 1000;
const MAX_EXPERIENCE_YEARS = 80;
const MAX_SALARY = 100_000_000;

export interface TrainerInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender?: TrainerGender;
  specialization?: string;
  experienceYears?: number;
  joiningDate?: Date;
  salary?: number;
  status?: TrainerStatus;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  profileImage?: string;
  notes?: string;
}

type TrainerValidationResult =
  | { success: true; data: TrainerInput; unsetFields: string[] }
  | { success: false; errors: string[] };

const editableFields = new Set<keyof TrainerInput>([
  'firstName',
  'lastName',
  'email',
  'phone',
  'gender',
  'specialization',
  'experienceYears',
  'joiningDate',
  'salary',
  'status',
  'address',
  'emergencyContactName',
  'emergencyContactPhone',
  'profileImage',
  'notes',
]);

function normalizePhone(value: string): string {
  return value.trim().replace(/[\s().-]/g, '');
}

function parseDate(value: unknown, errors: string[]): Date | undefined {
  if (typeof value !== 'string' && !(value instanceof Date)) {
    errors.push('Joining date must be a valid date');
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    errors.push('Joining date must be a valid date');
    return undefined;
  }
  return date;
}

export function validateTrainerInput(
  body: unknown,
  partial = false
): TrainerValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { success: false, errors: ['Request body must be a JSON object'] };
  }

  const source = body as Record<string, unknown>;
  const data: TrainerInput = {};
  const errors = Object.keys(source)
    .filter((field) => !editableFields.has(field as keyof TrainerInput))
    .map((field) => `Field "${field}" is not allowed`);
  const unsetFields: string[] = [];

  if (partial && !Object.keys(source).some((field) => editableFields.has(field as keyof TrainerInput))) {
    errors.push('At least one editable field is required');
  }

  const requiredString = (
    field: 'firstName' | 'lastName' | 'specialization',
    label: string,
    maximumLength: number
  ) => {
    const value = source[field];
    if (value === undefined) {
      if (!partial) errors.push(`${label} is required`);
    } else if (typeof value !== 'string') {
      errors.push(`${label} must be a string`);
    } else if (!value.trim()) {
      errors.push(`${label} cannot be empty`);
    } else if (value.trim().length > maximumLength) {
      errors.push(`${label} cannot exceed ${maximumLength} characters`);
    } else {
      data[field] = value.trim();
    }
  };

  const optionalString = (
    field: 'address' | 'emergencyContactName' | 'profileImage' | 'notes',
    label: string,
    maximumLength: number
  ) => {
    const value = source[field];
    if (value === undefined) return;
    if (value === null || (typeof value === 'string' && !value.trim())) {
      if (partial) unsetFields.push(field);
    } else if (typeof value !== 'string') {
      errors.push(`${label} must be a string`);
    } else if (value.trim().length > maximumLength) {
      errors.push(`${label} cannot exceed ${maximumLength} characters`);
    } else {
      data[field] = value.trim();
    }
  };

  requiredString('firstName', 'First name', MAX_NAME_LENGTH);
  requiredString('lastName', 'Last name', MAX_NAME_LENGTH);
  requiredString('specialization', 'Specialization', MAX_SPECIALIZATION_LENGTH);

  if (source.email !== undefined) {
    if (source.email === null || (typeof source.email === 'string' && !source.email.trim())) {
      if (partial) unsetFields.push('email');
    } else if (typeof source.email !== 'string') {
      errors.push('Email must be a string');
    } else {
      const email = source.email.trim().toLowerCase();
      if (email.length > MAX_EMAIL_LENGTH) errors.push(`Email cannot exceed ${MAX_EMAIL_LENGTH} characters`);
      else if (!EMAIL_PATTERN.test(email)) errors.push('Email must be valid');
      else data.email = email;
    }
  }

  const phone = source.phone;
  if (phone === undefined) {
    if (!partial) errors.push('Phone is required');
  } else if (typeof phone !== 'string' || !phone.trim()) {
    errors.push('Phone is required');
  } else {
    const normalized = normalizePhone(phone);
    if (!PHONE_PATTERN.test(normalized)) {
      errors.push('Phone must contain 7 to 15 digits and may start with +');
    } else data.phone = normalized;
  }

  if (source.gender !== undefined) {
    if (source.gender === null || source.gender === '') {
      if (partial) unsetFields.push('gender');
    } else if (
      typeof source.gender !== 'string' ||
      !TRAINER_GENDERS.includes(source.gender as TrainerGender)
    ) {
      errors.push(`Gender must be one of: ${TRAINER_GENDERS.join(', ')}`);
    } else data.gender = source.gender as TrainerGender;
  }

  if (source.experienceYears !== undefined) {
    const value = source.experienceYears;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push('Experience must be a finite number');
    } else if (value < 0 || value > MAX_EXPERIENCE_YEARS) {
      errors.push(`Experience must be between 0 and ${MAX_EXPERIENCE_YEARS} years`);
    } else data.experienceYears = value;
  }

  if (source.joiningDate !== undefined) {
    if (source.joiningDate === null || source.joiningDate === '') {
      errors.push('Joining date must be a valid date');
    } else data.joiningDate = parseDate(source.joiningDate, errors);
  }

  if (source.salary !== undefined) {
    const value = source.salary;
    if (value === null || value === '') {
      if (partial) unsetFields.push('salary');
    } else if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push('Salary must be a finite number');
    } else {
      if (value < 0 || value > MAX_SALARY) {
        errors.push(`Salary must be between 0 and ${MAX_SALARY}`);
      }
      if (Math.abs(value * 100 - Math.round(value * 100)) >= 1e-8) {
        errors.push('Salary cannot have more than two decimal places');
      }
      if (value >= 0 && value <= MAX_SALARY) data.salary = value;
    }
  }

  if (source.status !== undefined) {
    if (
      typeof source.status !== 'string' ||
      !TRAINER_STATUSES.includes(source.status as TrainerStatus)
    ) {
      errors.push(`Status must be one of: ${TRAINER_STATUSES.join(', ')}`);
    } else data.status = source.status as TrainerStatus;
  }

  optionalString('address', 'Address', MAX_ADDRESS_LENGTH);
  optionalString('emergencyContactName', 'Emergency contact name', MAX_NAME_LENGTH);
  optionalString('profileImage', 'Profile image', MAX_PROFILE_IMAGE_LENGTH);
  optionalString('notes', 'Notes', MAX_NOTES_LENGTH);

  if (data.profileImage) {
    if (!PROFILE_IMAGE_PATTERN.test(data.profileImage)) {
      errors.push('Profile image must be an http(s) URL or a web path');
    } else if (/[\u0000-\u001F\u007F]/.test(data.profileImage)) {
      errors.push('Profile image cannot contain control characters');
    }
  }

  if (source.emergencyContactPhone !== undefined) {
    const value = source.emergencyContactPhone;
    if (value === null || (typeof value === 'string' && !value.trim())) {
      if (partial) unsetFields.push('emergencyContactPhone');
    } else if (typeof value !== 'string') {
      errors.push('Emergency contact phone must be a string');
    } else {
      const normalized = normalizePhone(value);
      if (!PHONE_PATTERN.test(normalized)) {
        errors.push('Emergency contact phone must contain 7 to 15 digits and may start with +');
      } else data.emergencyContactPhone = normalized;
    }
  }

  return errors.length ? { success: false, errors } : { success: true, data, unsetFields };
}
