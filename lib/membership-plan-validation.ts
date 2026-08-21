import {
  MEMBERSHIP_PLAN_STATUSES,
  type MembershipPlanStatus,
} from '@/models/MembershipPlan';

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

export interface MembershipPlanInput {
  name?: string;
  description?: string;
  durationMonths?: number;
  price?: number;
  status?: MembershipPlanStatus;
}

type MembershipPlanValidationResult =
  | { success: true; data: MembershipPlanInput; unsetFields: string[] }
  | { success: false; errors: string[] };

const editableFields = new Set<keyof MembershipPlanInput>([
  'name',
  'description',
  'durationMonths',
  'price',
  'status',
]);

export function validateMembershipPlanInput(
  body: unknown,
  partial = false
): MembershipPlanValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { success: false, errors: ['Request body must be a JSON object'] };
  }

  const source = body as Record<string, unknown>;
  const data: MembershipPlanInput = {};
  const errors: string[] = [];
  const unsetFields: string[] = [];

  if (partial && !Object.keys(source).some((field) => editableFields.has(field as keyof MembershipPlanInput))) {
    errors.push('At least one editable field is required');
  }

  const name = source.name;
  if (name === undefined) {
    if (!partial) errors.push('Plan name is required');
  } else if (typeof name !== 'string') {
    errors.push('Plan name must be a string');
  } else if (!name.trim()) {
    errors.push('Plan name cannot be empty');
  } else if (name.trim().length > MAX_NAME_LENGTH) {
    errors.push(`Plan name cannot exceed ${MAX_NAME_LENGTH} characters`);
  } else {
    data.name = name.trim();
  }

  const description = source.description;
  if (description !== undefined) {
    if (description === null || (typeof description === 'string' && !description.trim())) {
      if (partial) unsetFields.push('description');
    } else if (typeof description !== 'string') {
      errors.push('Description must be a string');
    } else if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
      errors.push(`Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`);
    } else {
      data.description = description.trim();
    }
  }

  const durationMonths = source.durationMonths;
  if (durationMonths === undefined) {
    if (!partial) errors.push('Duration in months is required');
  } else if (
    typeof durationMonths !== 'number' ||
    !Number.isFinite(durationMonths) ||
    !Number.isInteger(durationMonths) ||
    durationMonths <= 0
  ) {
    errors.push('Duration in months must be a positive integer');
  } else {
    data.durationMonths = durationMonths;
  }

  const price = source.price;
  if (price === undefined) {
    if (!partial) errors.push('Price is required');
  } else if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    errors.push('Price must be a non-negative number');
  } else {
    data.price = price;
  }

  const status = source.status;
  if (status !== undefined) {
    if (
      typeof status !== 'string' ||
      !MEMBERSHIP_PLAN_STATUSES.includes(status as MembershipPlanStatus)
    ) {
      errors.push(`Status must be one of: ${MEMBERSHIP_PLAN_STATUSES.join(', ')}`);
    } else {
      data.status = status as MembershipPlanStatus;
    }
  }

  return errors.length ? { success: false, errors } : { success: true, data, unsetFields };
}
