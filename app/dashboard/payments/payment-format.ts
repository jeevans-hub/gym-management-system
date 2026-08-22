import type { PaymentMethod } from './types';

export const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

export function formatPaymentDate(value: string, includeTime = true): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return includeTime ? dateTimeFormatter.format(date) : dateFormatter.format(date);
}

export function paymentMemberName(member: { firstName: string; lastName: string }) {
  return `${member.firstName} ${member.lastName}`;
}

export function paymentMethodLabel(method: PaymentMethod): string {
  return {
    cash: 'Cash',
    upi: 'UPI',
    card: 'Card',
    'bank-transfer': 'Bank Transfer',
    other: 'Other',
  }[method];
}
