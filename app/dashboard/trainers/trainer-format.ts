import type { TrainerGender } from './types';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const salaryFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatTrainerDate(value?: string, includeTime = false): string {
  if (!value) return 'Not specified';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not specified';
  return includeTime ? dateTimeFormatter.format(date) : dateFormatter.format(date);
}

export function formatTrainerSalary(value?: number): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? salaryFormatter.format(value)
    : 'Not specified';
}

export function formatTrainerExperience(value: number): string {
  const years = Number.isFinite(value) ? value : 0;
  return `${years} ${years === 1 ? 'year' : 'years'}`;
}

export function formatTrainerGender(value?: TrainerGender): string {
  if (!value) return 'Not specified';
  return value
    .split('-')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}
