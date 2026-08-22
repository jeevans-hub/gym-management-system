import {
  GYM_CURRENCIES,
  GYM_TIMEZONES,
  type GymCurrency,
  type GymTimezone,
} from '@/models/GymSettings';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9]{7,15}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const EDITABLE_FIELDS = new Set([
  'gymName',
  'logo',
  'address',
  'phone',
  'email',
  'currency',
  'timezone',
  'openingTime',
  'closingTime',
  'membershipExpiryWarningDays',
]);

export interface GymSettingsInput {
  gymName: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  currency?: GymCurrency;
  timezone?: GymTimezone;
  openingTime?: string;
  closingTime?: string;
  membershipExpiryWarningDays?: number;
}

type ValidationResult =
  | { success: true; data: GymSettingsInput }
  | { success: false; errors: string[] };

function isSafeLogo(value: string): boolean {
  if (!value) return true;
  if (/[\u0000-\u001f\u007f]/.test(value)) return false;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizePhone(value: string): string {
  return value.trim().replace(/[\s().-]/g, '');
}

export function validateGymSettingsInput(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { success: false, errors: ['Request body must be a JSON object'] };
  }

  const source = body as Record<string, unknown>;
  const errors: string[] = [];
  const unknownFields = Object.keys(source).filter((field) => !EDITABLE_FIELDS.has(field));
  if (unknownFields.length) errors.push(`Unsupported field(s): ${unknownFields.join(', ')}`);

  const gymName = typeof source.gymName === 'string' ? source.gymName.trim() : '';
  if (!gymName) errors.push('Gym name is required');
  else if (gymName.length > 120) errors.push('Gym name must be 120 characters or fewer');

  const data: GymSettingsInput = { gymName };
  const optionalString = (
    field: 'logo' | 'address' | 'phone' | 'email',
    label: string,
    maxLength: number
  ) => {
    if (source[field] === undefined) return;
    if (typeof source[field] !== 'string') {
      errors.push(`${label} must be a string`);
      return;
    }
    const value = source[field].trim();
    if (value.length > maxLength) errors.push(`${label} must be ${maxLength} characters or fewer`);
    else data[field] = value;
  };

  optionalString('logo', 'Logo', 2048);
  optionalString('address', 'Address', 500);
  optionalString('phone', 'Phone', 32);
  optionalString('email', 'Email', 254);

  if (data.logo !== undefined && !isSafeLogo(data.logo)) {
    errors.push('Logo must be an HTTP(S) URL or an absolute application path');
  }
  if (data.phone) {
    const phone = normalizePhone(data.phone);
    if (!PHONE_PATTERN.test(phone)) errors.push('Phone must contain 7 to 15 digits and may start with +');
    else data.phone = phone;
  }
  if (data.email) {
    const email = data.email.toLowerCase();
    if (!EMAIL_PATTERN.test(email)) errors.push('Email must be valid');
    else data.email = email;
  }

  if (source.currency !== undefined) {
    if (typeof source.currency !== 'string' || !GYM_CURRENCIES.includes(source.currency as GymCurrency)) {
      errors.push(`Currency must be one of: ${GYM_CURRENCIES.join(', ')}`);
    } else data.currency = source.currency as GymCurrency;
  }

  if (source.timezone !== undefined) {
    if (typeof source.timezone !== 'string' || !GYM_TIMEZONES.includes(source.timezone as GymTimezone)) {
      errors.push(`Timezone must be one of: ${GYM_TIMEZONES.join(', ')}`);
    } else data.timezone = source.timezone as GymTimezone;
  }

  for (const [field, label] of [
    ['openingTime', 'Opening time'],
    ['closingTime', 'Closing time'],
  ] as const) {
    if (source[field] === undefined) continue;
    if (typeof source[field] !== 'string' || !TIME_PATTERN.test(source[field])) {
      errors.push(`${label} must use HH:mm 24-hour format`);
    } else data[field] = source[field];
  }

  if (source.membershipExpiryWarningDays !== undefined) {
    const value = source.membershipExpiryWarningDays;
    if (!Number.isInteger(value) || typeof value !== 'number' || value < 0 || value > 365) {
      errors.push('Membership expiry warning days must be an integer from 0 to 365');
    } else data.membershipExpiryWarningDays = value;
  }

  return errors.length ? { success: false, errors } : { success: true, data };
}
