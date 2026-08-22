import type { ReportRangePreset } from './types';

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

export function formatReportDate(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : dateFormatter.format(date);
}

export function formatGymDate(value?: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '—';
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatReportDateTime(value?: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : `${dateTimeFormatter.format(date)} IST`;
}

export function paymentMethodLabel(value: string): string {
  if (value === 'upi') return 'UPI';
  return value.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join(' ');
}

export function experienceLabel(value: number): string {
  return `${value} ${value === 1 ? 'year' : 'years'}`;
}

export function isValidGymDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

export function validateCustomRange(preset: ReportRangePreset, from: string, to: string): string {
  if (preset !== 'custom') return '';
  if (!from || !to) return 'Choose both a From and To gym date.';
  if (!isValidGymDate(from) || !isValidGymDate(to)) return 'Choose valid calendar dates.';
  if (from > to) return 'From date cannot be after To date.';
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return days > 366 ? 'Date range cannot exceed 366 inclusive gym days.' : '';
}

export function rangeQuery(preset: ReportRangePreset, from: string, to: string): URLSearchParams {
  const params = new URLSearchParams({ range: preset });
  if (preset === 'custom') {
    params.set('from', from);
    params.set('to', to);
  }
  return params;
}

export function rangeLabel(preset: ReportRangePreset, from: string, to: string): string {
  if (preset === 'today') return 'Today';
  if (preset === 'this-week') return 'This Week';
  if (preset === 'this-month') return 'This Month';
  return from && to ? `${formatGymDate(from)} – ${formatGymDate(to)}` : 'Custom Range';
}
