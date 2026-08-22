export const USER_ROLES = ['admin', 'staff'] as const;
export type UserRole = (typeof USER_ROLES)[number];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 128;

interface UserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

type ValidationResult =
  | { success: true; data: UserInput }
  | { success: false; errors: string[] };

function validateBase(
  body: unknown,
  allowedFields: Set<string>,
  requiredFields: Set<string>
): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { success: false, errors: ['Request body must be a JSON object'] };
  }

  const source = body as Record<string, unknown>;
  const data: UserInput = {};
  const errors: string[] = [];
  const unknownFields = Object.keys(source).filter((field) => !allowedFields.has(field));
  if (unknownFields.length) errors.push(`Unsupported field(s): ${unknownFields.join(', ')}`);

  if (!Object.keys(source).some((field) => allowedFields.has(field))) {
    errors.push('At least one editable field is required');
  }

  if (allowedFields.has('name') && (source.name !== undefined || requiredFields.has('name'))) {
    if (typeof source.name !== 'string' || source.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    } else if (source.name.trim().length > 100) errors.push('Name must be 100 characters or fewer');
    else data.name = source.name.trim();
  }

  if (allowedFields.has('email') && (source.email !== undefined || requiredFields.has('email'))) {
    if (typeof source.email !== 'string') errors.push('Email is required');
    else {
      const email = source.email.trim().toLowerCase();
      if (!EMAIL_PATTERN.test(email) || email.length > 254) errors.push('Email must be valid');
      else data.email = email;
    }
  }

  if (allowedFields.has('password') && (source.password !== undefined || requiredFields.has('password'))) {
    if (typeof source.password !== 'string') errors.push('Password is required');
    else if (source.password.length < MIN_PASSWORD_LENGTH || source.password.length > MAX_PASSWORD_LENGTH) {
      errors.push(`Password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters`);
    } else if (!/[A-Za-z]/.test(source.password) || !/\d/.test(source.password)) {
      errors.push('Password must include at least one letter and one number');
    } else data.password = source.password;
  }

  if (allowedFields.has('role') && (source.role !== undefined || requiredFields.has('role'))) {
    if (typeof source.role !== 'string' || !USER_ROLES.includes(source.role as UserRole)) {
      errors.push(`Role must be one of: ${USER_ROLES.join(', ')}`);
    } else data.role = source.role as UserRole;
  }

  return errors.length ? { success: false, errors } : { success: true, data };
}

export function validateFirstAdminInput(body: unknown): ValidationResult {
  const fields = new Set(['name', 'email', 'password']);
  return validateBase(body, fields, fields);
}

export function validateAdminUserCreateInput(body: unknown): ValidationResult {
  const fields = new Set(['name', 'email', 'password', 'role']);
  return validateBase(body, fields, fields);
}

export function validateAdminUserUpdateInput(body: unknown): ValidationResult {
  return validateBase(body, new Set(['name', 'email', 'role']), new Set());
}
