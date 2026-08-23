import mongoose from 'mongoose';
import {
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_RECIPIENT_ROLES,
  NOTIFICATION_TYPES,
} from '@/models/Notification';

export interface NotificationInput {
  type: (typeof NOTIFICATION_TYPES)[number];
  title: string;
  message: string;
  priority: (typeof NOTIFICATION_PRIORITIES)[number];
  category?: string;
  recipientRole?: (typeof NOTIFICATION_RECIPIENT_ROLES)[number];
  recipientUser?: string;
  relatedMember?: string;
  relatedMembership?: string;
  relatedPayment?: string;
  relatedTrainer?: string;
  expiresAt?: Date;
}

type ValidationResult = { success: true; data: NotificationInput } | { success: false; errors: string[] };
const ALLOWED_FIELDS = new Set([
  'type', 'title', 'message', 'priority', 'category', 'recipientRole', 'recipientUser',
  'relatedMember', 'relatedMembership', 'relatedPayment', 'relatedTrainer', 'expiresAt',
]);

function parseDate(value: unknown, label: string, errors: string[]): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' && !(value instanceof Date)) {
    errors.push(`${label} must be a valid date`);
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) errors.push(`${label} must be a valid date`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function validateNotificationInput(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { success: false, errors: ['Request body must be a JSON object'] };
  }
  const source = body as Record<string, unknown>;
  const errors: string[] = [];
  const unknown = Object.keys(source).filter((field) => !ALLOWED_FIELDS.has(field));
  if (unknown.length) errors.push(`Unsupported fields: ${unknown.join(', ')}`);
  const data = {} as NotificationInput;

  for (const field of ['title', 'message'] as const) {
    const value = source[field];
    if (typeof value !== 'string' || !value.trim()) errors.push(`${field} is required`);
    else if (value.trim().length > (field === 'title' ? 160 : 2000)) errors.push(`${field} is too long`);
    else data[field] = value.trim();
  }
  if (typeof source.type !== 'string' || !NOTIFICATION_TYPES.includes(source.type as NotificationInput['type'])) {
    errors.push(`type must be one of: ${NOTIFICATION_TYPES.join(', ')}`);
  } else data.type = source.type as NotificationInput['type'];
  if (typeof source.priority !== 'string' || !NOTIFICATION_PRIORITIES.includes(source.priority as NotificationInput['priority'])) {
    errors.push(`priority must be one of: ${NOTIFICATION_PRIORITIES.join(', ')}`);
  } else data.priority = source.priority as NotificationInput['priority'];

  if (source.category !== undefined) {
    if (typeof source.category !== 'string' || !source.category.trim() || source.category.trim().length > 80) errors.push('category must be a non-empty string of 80 characters or fewer');
    else data.category = source.category.trim();
  }
  if (source.recipientRole !== undefined) {
    if (typeof source.recipientRole !== 'string' || !NOTIFICATION_RECIPIENT_ROLES.includes(source.recipientRole as (typeof NOTIFICATION_RECIPIENT_ROLES)[number])) errors.push(`recipientRole must be one of: ${NOTIFICATION_RECIPIENT_ROLES.join(', ')}`);
    else data.recipientRole = source.recipientRole as (typeof NOTIFICATION_RECIPIENT_ROLES)[number];
  }
  for (const field of ['recipientUser', 'relatedMember', 'relatedMembership', 'relatedPayment', 'relatedTrainer'] as const) {
    if (source[field] !== undefined) {
      if (typeof source[field] !== 'string' || !mongoose.isObjectIdOrHexString(source[field])) errors.push(`${field} must be a valid identifier`);
      else data[field] = source[field];
    }
  }
  if (source.expiresAt !== undefined) data.expiresAt = parseDate(source.expiresAt, 'expiresAt', errors);
  return errors.length ? { success: false, errors } : { success: true, data };
}
