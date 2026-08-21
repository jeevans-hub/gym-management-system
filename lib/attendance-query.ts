import mongoose from 'mongoose';
import Attendance from '@/models/Attendance';

export const DEFAULT_ATTENDANCE_LIMIT = 10;
export const MAX_ATTENDANCE_LIMIT = 100;

export function memberLookup(value: string) {
  const normalized = value.trim();
  return mongoose.isObjectIdOrHexString(normalized)
    ? { $or: [{ _id: normalized }, { memberId: normalized.toUpperCase() }] }
    : { memberId: normalized.toUpperCase() };
}

export function attendanceDetail(id: string) {
  return Attendance.findById(id)
    .select('-__v')
    .populate('member', 'memberId firstName lastName phone -_id')
    .populate('recordedBy', 'name role -_id');
}

export function parsePagination(pageText: string | null, limitText: string | null) {
  const page = Number(pageText ?? 1);
  const requestedLimit = Number(limitText ?? DEFAULT_ATTENDANCE_LIMIT);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(requestedLimit) || requestedLimit < 1) {
    return null;
  }
  return { page, limit: Math.min(requestedLimit, MAX_ATTENDANCE_LIMIT) };
}

export function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
