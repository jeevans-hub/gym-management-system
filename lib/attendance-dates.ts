const IST_OFFSET_MINUTES = 5 * 60 + 30;
const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;
const GYM_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Attendance-day policy:
 * - The gym timezone is fixed to Asia/Kolkata (UTC+05:30; no daylight saving).
 * - A gym day runs from 00:00:00 IST inclusive to the next 00:00:00 IST exclusive.
 * - attendanceDate stores the UTC instant corresponding to that IST midnight.
 */
export function getGymDateKey(now = new Date()): string {
  assertValidDate(now);
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function attendanceDateFromKey(dateKey: string): Date | null {
  const match = GYM_DATE_PATTERN.exec(dateKey.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcMidnight = new Date(Date.UTC(year, month - 1, day) - IST_OFFSET_MS);

  return getGymDateKey(utcMidnight) === dateKey.trim() ? utcMidnight : null;
}

export function normalizeAttendanceDate(now = new Date()): Date {
  const normalized = attendanceDateFromKey(getGymDateKey(now));
  if (!normalized) throw new Error('Unable to normalize attendance date');
  return normalized;
}

export function getGymDayBounds(dateKey: string): { start: Date; end: Date } | null {
  const start = attendanceDateFromKey(dateKey);
  if (!start) return null;
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function assertValidDate(value: Date): void {
  if (Number.isNaN(value.getTime())) throw new Error('Date must be valid');
}
