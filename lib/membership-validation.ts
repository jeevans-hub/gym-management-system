const MAX_NOTES_LENGTH = 1000;

export interface MembershipAssignmentInput {
  memberId: string;
  planId: string;
  startDate: Date;
  notes?: string;
}

export interface MembershipUpdateInput {
  notes?: string;
  status?: 'cancelled';
}

type AssignmentValidationResult =
  | { success: true; data: MembershipAssignmentInput }
  | { success: false; errors: string[] };

type UpdateValidationResult =
  | { success: true; data: MembershipUpdateInput; unsetNotes: boolean }
  | { success: false; errors: string[] };

function objectSource(body: unknown): Record<string, unknown> | null {
  return body && typeof body === 'object' && !Array.isArray(body)
    ? (body as Record<string, unknown>)
    : null;
}

function unknownFieldErrors(source: Record<string, unknown>, allowed: Set<string>): string[] {
  return Object.keys(source)
    .filter((field) => !allowed.has(field))
    .map((field) => `Field "${field}" is not allowed`);
}

function normalizedNotes(
  value: unknown,
  errors: string[]
): { value?: string; shouldUnset: boolean } {
  if (value === undefined) return { shouldUnset: false };
  if (value === null || (typeof value === 'string' && !value.trim())) {
    return { shouldUnset: true };
  }
  if (typeof value !== 'string') {
    errors.push('Notes must be a string');
    return { shouldUnset: false };
  }
  const notes = value.trim();
  if (notes.length > MAX_NOTES_LENGTH) {
    errors.push(`Notes cannot exceed ${MAX_NOTES_LENGTH} characters`);
    return { shouldUnset: false };
  }
  return { value: notes, shouldUnset: false };
}

export function validateMembershipAssignment(body: unknown): AssignmentValidationResult {
  const source = objectSource(body);
  if (!source) {
    return { success: false, errors: ['Request body must be a JSON object'] };
  }

  const errors = unknownFieldErrors(
    source,
    new Set(['memberId', 'planId', 'startDate', 'notes'])
  );

  const memberId = typeof source.memberId === 'string' ? source.memberId.trim() : '';
  if (!memberId) errors.push('Member ID is required');

  const planId = typeof source.planId === 'string' ? source.planId.trim() : '';
  if (!planId) errors.push('Plan ID is required');

  let startDate: Date | undefined;
  if (typeof source.startDate !== 'string' && !(source.startDate instanceof Date)) {
    errors.push('Start date must be a valid date');
  } else {
    const parsedDate = new Date(source.startDate);
    if (Number.isNaN(parsedDate.getTime())) errors.push('Start date must be a valid date');
    else startDate = parsedDate;
  }

  const notes = normalizedNotes(source.notes, errors);
  if (errors.length || !startDate) return { success: false, errors };

  return {
    success: true,
    data: {
      memberId,
      planId,
      startDate,
      ...(notes.value ? { notes: notes.value } : {}),
    },
  };
}

export function validateMembershipUpdate(body: unknown): UpdateValidationResult {
  const source = objectSource(body);
  if (!source) {
    return { success: false, errors: ['Request body must be a JSON object'] };
  }

  const errors = unknownFieldErrors(source, new Set(['notes', 'status']));
  if (!Object.keys(source).some((field) => field === 'notes' || field === 'status')) {
    errors.push('At least one editable field is required');
  }

  const data: MembershipUpdateInput = {};
  const notes = normalizedNotes(source.notes, errors);
  if (notes.value) data.notes = notes.value;

  if (source.status !== undefined) {
    if (source.status !== 'cancelled') {
      errors.push('Status can only transition to cancelled');
    } else {
      data.status = 'cancelled';
    }
  }

  return errors.length
    ? { success: false, errors }
    : { success: true, data, unsetNotes: notes.shouldUnset };
}
