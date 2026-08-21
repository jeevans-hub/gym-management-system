import type { QueryFilter } from 'mongoose';
import Membership, { type IMembership } from '@/models/Membership';

/**
 * Adds whole UTC calendar months while preserving the time of day. If the
 * original day does not exist in the target month, it clamps to that month's
 * final day (for example, January 31 + one month becomes February 28 or 29).
 */
export function calculateMembershipEndDate(startDate: Date, durationMonths: number): Date {
  if (Number.isNaN(startDate.getTime())) {
    throw new Error('Start date must be valid');
  }
  if (!Number.isInteger(durationMonths) || durationMonths <= 0) {
    throw new Error('Duration must be a positive integer');
  }

  const absoluteMonth = startDate.getUTCMonth() + durationMonths;
  const targetYear = startDate.getUTCFullYear() + Math.floor(absoluteMonth / 12);
  const targetMonth = absoluteMonth % 12;
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(startDate.getUTCDate(), lastDayOfTargetMonth);

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      targetDay,
      startDate.getUTCHours(),
      startDate.getUTCMinutes(),
      startDate.getUTCSeconds(),
      startDate.getUTCMilliseconds()
    )
  );
}

/** A membership expires once its end timestamp is earlier than the current instant. */
export function isMembershipExpired(endDate: Date, now = new Date()): boolean {
  return endDate.getTime() < now.getTime();
}

export async function expireMemberships(
  filter: QueryFilter<IMembership> = {},
  now = new Date()
): Promise<number> {
  const result = await Membership.updateMany(
    { ...filter, status: 'active', endDate: { $lt: now } },
    { $set: { status: 'expired' } }
  );

  return result.modifiedCount;
}
