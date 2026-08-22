import mongoose, { type ClientSession } from 'mongoose';
import Payment from '@/models/Payment';

export const DEFAULT_PAYMENT_LIMIT = 10;
export const MAX_PAYMENT_LIMIT = 100;

export function parsePaymentPagination(pageText: string | null, limitText: string | null) {
  const page = Number(pageText ?? 1);
  const requestedLimit = Number(limitText ?? DEFAULT_PAYMENT_LIMIT);
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(requestedLimit) ||
    requestedLimit < 1
  ) {
    return null;
  }
  return { page, limit: Math.min(requestedLimit, MAX_PAYMENT_LIMIT) };
}

export function paymentMemberLookup(value: string) {
  const normalized = value.trim();
  return mongoose.isObjectIdOrHexString(normalized)
    ? { $or: [{ _id: normalized }, { memberId: normalized.toUpperCase() }] }
    : { memberId: normalized.toUpperCase() };
}

export function escapePaymentRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function paymentDetail(id: string) {
  return Payment.findById(id)
    .select('-__v')
    .populate('member', 'memberId firstName lastName phone -_id')
    .populate({
      path: 'membership',
      select: 'plan startDate endDate priceAtPurchase status',
      populate: { path: 'plan', select: 'name durationMonths status -_id' },
    })
    .populate('recordedBy', 'name email role -_id');
}

export function currencyToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100);
}

export function centsToCurrency(value: number): number {
  return Number((value / 100).toFixed(2));
}

export async function getMembershipPaymentTotals(
  membershipId: mongoose.Types.ObjectId | string,
  priceAtPurchase: number,
  session?: ClientSession
) {
  const objectId = new mongoose.Types.ObjectId(membershipId);
  const aggregate = Payment.aggregate<{ totalPaid: number }>([
    { $match: { membership: objectId, status: 'paid' } },
    { $group: { _id: null, totalPaid: { $sum: '$amount' } } },
  ]);
  if (session) aggregate.session(session);
  const [result] = await aggregate.exec();
  const totalPaidCents = currencyToCents(result?.totalPaid ?? 0);
  const priceCents = currencyToCents(priceAtPurchase);

  return {
    totalPaid: centsToCurrency(totalPaidCents),
    remainingBalance: centsToCurrency(Math.max(priceCents - totalPaidCents, 0)),
  };
}
