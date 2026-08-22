import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { getGymDayBounds } from '@/lib/attendance-dates';
import {
  centsToCurrency,
  currencyToCents,
  escapePaymentRegex,
  getMembershipPaymentTotals,
  parsePaymentPagination,
  paymentDetail,
  paymentMemberLookup,
} from '@/lib/payment-query';
import { validatePaymentCreate } from '@/lib/payment-validation';
import connectDB from '@/lib/mongodb';
import Member from '@/models/Member';
import Membership from '@/models/Membership';
import Payment, {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type PaymentMethod,
  type PaymentStatus,
} from '@/models/Payment';
import '@/models/MembershipPlan';
import '@/models/User';

class OverpaymentError extends Error {
  constructor(readonly remainingBalance: number) {
    super('Payment exceeds the remaining membership balance');
  }
}

export async function GET(request: NextRequest) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const pagination = parsePaymentPagination(
      request.nextUrl.searchParams.get('page'),
      request.nextUrl.searchParams.get('limit')
    );
    if (!pagination) {
      return NextResponse.json(
        { error: 'Page and limit must be positive integers' },
        { status: 400 }
      );
    }

    const memberValue = request.nextUrl.searchParams.get('member')?.trim();
    const membershipValue = request.nextUrl.searchParams.get('membership')?.trim();
    const paymentMethod = request.nextUrl.searchParams.get('paymentMethod')?.trim();
    const status = request.nextUrl.searchParams.get('status')?.trim();
    const search = request.nextUrl.searchParams.get('search')?.trim();
    const date = request.nextUrl.searchParams.get('date')?.trim();
    const from = request.nextUrl.searchParams.get('from')?.trim();
    const to = request.nextUrl.searchParams.get('to')?.trim();

    if (
      paymentMethod &&
      !PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)
    ) {
      return NextResponse.json(
        { error: `Payment method must be one of: ${PAYMENT_METHODS.join(', ')}` },
        { status: 400 }
      );
    }
    if (status && !PAYMENT_STATUSES.includes(status as PaymentStatus)) {
      return NextResponse.json(
        { error: `Status must be one of: ${PAYMENT_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }
    if (membershipValue && !mongoose.isObjectIdOrHexString(membershipValue)) {
      return NextResponse.json({ error: 'Membership filter must be a valid ID' }, { status: 400 });
    }
    if (date && (from || to)) {
      return NextResponse.json(
        { error: 'Use either an exact date or a date range, not both' },
        { status: 400 }
      );
    }

    const dayBounds = date ? getGymDayBounds(date) : null;
    const fromBounds = from ? getGymDayBounds(from) : null;
    const toBounds = to ? getGymDayBounds(to) : null;
    if ((date && !dayBounds) || (from && !fromBounds) || (to && !toBounds)) {
      return NextResponse.json(
        { error: 'Date values must use the YYYY-MM-DD format' },
        { status: 400 }
      );
    }
    if (fromBounds && toBounds && fromBounds.start > toBounds.start) {
      return NextResponse.json({ error: 'From date cannot be after to date' }, { status: 400 });
    }

    await connectDB();
    const filter: Record<string, unknown> = {};
    if (membershipValue) filter.membership = membershipValue;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (status) filter.status = status;
    if (dayBounds) {
      filter.paymentDate = { $gte: dayBounds.start, $lt: dayBounds.end };
    } else if (fromBounds || toBounds) {
      filter.paymentDate = {
        ...(fromBounds ? { $gte: fromBounds.start } : {}),
        ...(toBounds ? { $lt: toBounds.end } : {}),
      };
    }

    if (memberValue) {
      const member = await Member.findOne(paymentMemberLookup(memberValue)).select('_id').lean();
      if (!member) {
        return NextResponse.json({ payments: [], ...pagination, total: 0, totalPages: 0 });
      }
      filter.member = member._id;
    }

    if (search) {
      const pattern = new RegExp(escapePaymentRegex(search), 'i');
      const memberIds = await Member.find({
        $or: [
          { memberId: pattern },
          { firstName: pattern },
          { lastName: pattern },
          { phone: pattern },
        ],
      }).distinct('_id');
      filter.$or = [
        { member: { $in: memberIds } },
        { transactionReference: pattern },
      ];
    }

    const { page, limit } = pagination;
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .select('-__v')
        .sort({ paymentDate: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('member', 'memberId firstName lastName phone -_id')
        .populate({
          path: 'membership',
          select: 'plan startDate endDate priceAtPurchase status',
          populate: { path: 'plan', select: 'name durationMonths status -_id' },
        })
        .populate('recordedBy', 'name email role -_id')
        .lean(),
      Payment.countDocuments(filter),
    ]);

    return NextResponse.json({
      payments,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List payments error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to retrieve payments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authenticatedUser = await authenticateApiRequest();
  if (!authenticatedUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const validation = validatePaymentCreate(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    await connectDB();
    const member = await Member.findOne(paymentMemberLookup(validation.data.memberId))
      .select('_id')
      .lean();
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    if (!mongoose.isObjectIdOrHexString(validation.data.membershipId)) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }
    const membership = await Membership.findById(validation.data.membershipId)
      .select('member priceAtPurchase')
      .lean();
    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }
    if (!membership.member.equals(member._id)) {
      return NextResponse.json(
        { error: 'Membership does not belong to the supplied member' },
        { status: 400 }
      );
    }

    await Payment.init();
    const session = await mongoose.startSession();
    const createdPayment: { id?: string } = {};
    let totals = { totalPaid: 0, remainingBalance: membership.priceAtPurchase };

    try {
      await session.withTransaction(
        async () => {
          const lockedMembership = await Membership.findOneAndUpdate(
            { _id: membership._id, member: member._id },
            { $set: { updatedAt: new Date() } },
            { returnDocument: 'after', session }
          )
            .select('priceAtPurchase')
            .lean();
          if (!lockedMembership) throw new Error('Referenced membership is unavailable');

          const currentTotals = await getMembershipPaymentTotals(
            membership._id,
            lockedMembership.priceAtPurchase,
            session
          );
          const remainingCents = currencyToCents(currentTotals.remainingBalance);
          const paymentCents = currencyToCents(validation.data.amount);
          if (paymentCents > remainingCents) {
            throw new OverpaymentError(currentTotals.remainingBalance);
          }

          const [payment] = await Payment.create(
            [
              {
                member: member._id,
                membership: membership._id,
                amount: validation.data.amount,
                paymentDate: new Date(),
                paymentMethod: validation.data.paymentMethod,
                status: 'paid',
                transactionReference: validation.data.transactionReference,
                notes: validation.data.notes,
                recordedBy: authenticatedUser.userId,
              },
            ],
            { session }
          );
          createdPayment.id = payment._id.toString();
          totals = {
            totalPaid: centsToCurrency(
              currencyToCents(currentTotals.totalPaid) + paymentCents
            ),
            remainingBalance: centsToCurrency(remainingCents - paymentCents),
          };
        },
        { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }
      );
    } finally {
      await session.endSession();
    }

    if (!createdPayment.id) throw new Error('Payment transaction did not create a record');
    const payment = await paymentDetail(createdPayment.id).lean();
    return NextResponse.json({ success: true, payment, totals }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (error instanceof OverpaymentError) {
      return NextResponse.json(
        {
          error: error.message,
          remainingBalance: error.remainingBalance,
        },
        { status: 409 }
      );
    }
    console.error('Record payment error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to record payment' }, { status: 500 });
  }
}
