import { PAYMENT_METHODS, type PaymentMethod } from '@/models/Payment';

const MAX_TRANSACTION_REFERENCE_LENGTH = 150;
const MAX_NOTES_LENGTH = 1000;
const MAX_PAYMENT_AMOUNT = 1_000_000_000;

export interface PaymentCreateInput {
  memberId: string;
  membershipId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
}

export interface PaymentUpdateInput {
  transactionReference?: string;
  notes?: string;
  status?: 'refunded';
}

type CreateValidationResult =
  | { success: true; data: PaymentCreateInput }
  | { success: false; errors: string[] };

type UpdateValidationResult =
  | {
      success: true;
      data: PaymentUpdateInput;
      unsetTransactionReference: boolean;
      unsetNotes: boolean;
    }
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

function optionalTrimmedString(
  label: string,
  value: unknown,
  maximumLength: number,
  errors: string[]
): { value?: string; shouldUnset: boolean } {
  if (value === undefined) return { shouldUnset: false };
  if (value === null || (typeof value === 'string' && !value.trim())) {
    return { shouldUnset: true };
  }
  if (typeof value !== 'string') {
    errors.push(`${label} must be a string`);
    return { shouldUnset: false };
  }
  const normalized = value.trim();
  if (normalized.length > maximumLength) {
    errors.push(`${label} cannot exceed ${maximumLength} characters`);
    return { shouldUnset: false };
  }
  return { value: normalized, shouldUnset: false };
}

export function validatePaymentCreate(body: unknown): CreateValidationResult {
  const source = objectSource(body);
  if (!source) return { success: false, errors: ['Request body must be a JSON object'] };

  const errors = unknownFieldErrors(
    source,
    new Set([
      'memberId',
      'membershipId',
      'amount',
      'paymentMethod',
      'transactionReference',
      'notes',
    ])
  );

  const memberId = typeof source.memberId === 'string' ? source.memberId.trim() : '';
  if (!memberId) errors.push('Member ID is required');

  const membershipId =
    typeof source.membershipId === 'string' ? source.membershipId.trim() : '';
  if (!membershipId) errors.push('Membership ID is required');

  const amount = source.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    errors.push('Amount must be a finite number');
  } else {
    if (amount <= 0) errors.push('Amount must be greater than zero');
    if (amount > MAX_PAYMENT_AMOUNT) {
      errors.push(`Amount cannot exceed ${MAX_PAYMENT_AMOUNT}`);
    }
    if (Math.abs(amount * 100 - Math.round(amount * 100)) >= 1e-8) {
      errors.push('Amount cannot have more than two decimal places');
    }
  }

  const paymentMethod = source.paymentMethod;
  if (
    typeof paymentMethod !== 'string' ||
    !PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)
  ) {
    errors.push(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`);
  }

  const transactionReference = optionalTrimmedString(
    'Transaction reference',
    source.transactionReference,
    MAX_TRANSACTION_REFERENCE_LENGTH,
    errors
  );
  if (transactionReference.value && /[\u0000-\u001F\u007F]/.test(transactionReference.value)) {
    errors.push('Transaction reference cannot contain control characters');
  }
  const notes = optionalTrimmedString(
    'Notes',
    source.notes,
    MAX_NOTES_LENGTH,
    errors
  );

  if (errors.length || typeof amount !== 'number' || typeof paymentMethod !== 'string') {
    return { success: false, errors };
  }

  return {
    success: true,
    data: {
      memberId,
      membershipId,
      amount,
      paymentMethod: paymentMethod as PaymentMethod,
      ...(transactionReference.value
        ? { transactionReference: transactionReference.value }
        : {}),
      ...(notes.value ? { notes: notes.value } : {}),
    },
  };
}

export function validatePaymentUpdate(body: unknown): UpdateValidationResult {
  const source = objectSource(body);
  if (!source) return { success: false, errors: ['Request body must be a JSON object'] };

  const errors = unknownFieldErrors(
    source,
    new Set(['transactionReference', 'notes', 'status'])
  );
  if (!Object.keys(source).some((field) => ['transactionReference', 'notes', 'status'].includes(field))) {
    errors.push('At least one editable field is required');
  }

  const transactionReference = optionalTrimmedString(
    'Transaction reference',
    source.transactionReference,
    MAX_TRANSACTION_REFERENCE_LENGTH,
    errors
  );
  if (transactionReference.value && /[\u0000-\u001F\u007F]/.test(transactionReference.value)) {
    errors.push('Transaction reference cannot contain control characters');
  }
  const notes = optionalTrimmedString(
    'Notes',
    source.notes,
    MAX_NOTES_LENGTH,
    errors
  );

  const data: PaymentUpdateInput = {};
  if (transactionReference.value) data.transactionReference = transactionReference.value;
  if (notes.value) data.notes = notes.value;
  if (source.status !== undefined) {
    if (source.status !== 'refunded') {
      errors.push('Status can only transition from paid to refunded');
    } else {
      data.status = 'refunded';
    }
  }

  return errors.length
    ? { success: false, errors }
    : {
        success: true,
        data,
        unsetTransactionReference: transactionReference.shouldUnset,
        unsetNotes: notes.shouldUnset,
      };
}
