const MAX_NOTES_LENGTH = 500;

type CheckInValidationResult =
  | { success: true; data: { memberId: string; notes?: string } }
  | { success: false; errors: string[] };

type EmptyBodyValidationResult =
  | { success: true }
  | { success: false; errors: string[] };

function objectSource(body: unknown): Record<string, unknown> | null {
  return body && typeof body === 'object' && !Array.isArray(body)
    ? body as Record<string, unknown>
    : null;
}

export function validateAttendanceCheckIn(body: unknown): CheckInValidationResult {
  const source = objectSource(body);
  if (!source) return { success: false, errors: ['Request body must be a JSON object'] };

  const errors = Object.keys(source)
    .filter((field) => field !== 'memberId' && field !== 'notes')
    .map((field) => `Field "${field}" is not allowed`);

  const memberId = typeof source.memberId === 'string' ? source.memberId.trim() : '';
  if (!memberId) errors.push('Member ID is required');

  let notes: string | undefined;
  if (source.notes !== undefined && source.notes !== null && source.notes !== '') {
    if (typeof source.notes !== 'string') errors.push('Notes must be a string');
    else {
      notes = source.notes.trim();
      if (notes.length > MAX_NOTES_LENGTH) errors.push(`Notes cannot exceed ${MAX_NOTES_LENGTH} characters`);
    }
  }

  return errors.length
    ? { success: false, errors }
    : { success: true, data: { memberId, ...(notes ? { notes } : {}) } };
}

export function validateEmptyAttendanceBody(body: unknown): EmptyBodyValidationResult {
  const source = objectSource(body);
  if (!source) return { success: false, errors: ['Request body must be a JSON object'] };
  const fields = Object.keys(source);
  return fields.length
    ? { success: false, errors: fields.map((field) => `Field "${field}" is not allowed`) }
    : { success: true };
}
