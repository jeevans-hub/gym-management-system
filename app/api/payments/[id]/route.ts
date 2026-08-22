import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { getMembershipPaymentTotals, paymentDetail } from '@/lib/payment-query';
import { validatePaymentUpdate } from '@/lib/payment-validation';
import connectDB from '@/lib/mongodb';
import Membership from '@/models/Membership';
import Payment from '@/models/Payment';
import '@/models/Member';
import '@/models/MembershipPlan';
import '@/models/User';

function validPaymentId(value: string): string | null {
  const normalized = value.trim();
  return mongoose.isObjectIdOrHexString(normalized) ? normalized : null;
}

async function paymentTotals(paymentId: string) {
  const payment = await Payment.findById(paymentId).select('membership').lean();
  if (!payment) return null;
  const membership = await Membership.findById(payment.membership)
    .select('priceAtPurchase')
    .lean();
  if (!membership) return null;
  return getMembershipPaymentTotals(
    payment.membership,
    membership.priceAtPurchase
  );
}

export async function GET(
  _request: NextRequest,
  context: RouteContext<'/api/payments/[id]'>
) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const objectId = validPaymentId(id);
    if (!objectId) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    await connectDB();
    const [payment, totals] = await Promise.all([
      paymentDetail(objectId).lean(),
      paymentTotals(objectId),
    ]);
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    return NextResponse.json({ payment, totals });
  } catch (error) {
    console.error('Get payment error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to retrieve payment' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<'/api/payments/[id]'>
) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const validation = validatePaymentUpdate(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { id } = await context.params;
    const objectId = validPaymentId(id);
    if (!objectId) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    await connectDB();
    const existingPayment = await Payment.findById(objectId)
      .select('membership status')
      .lean();
    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    if (validation.data.status === 'refunded' && existingPayment.status !== 'paid') {
      return NextResponse.json(
        { error: 'Only a paid payment can be refunded' },
        { status: 409 }
      );
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(
        async () => {
          const lockedMembership = await Membership.findByIdAndUpdate(
            existingPayment.membership,
            { $set: { updatedAt: new Date() } },
            { returnDocument: 'after', session }
          )
            .select('_id')
            .lean();
          if (!lockedMembership) throw new Error('Referenced membership is unavailable');

          const update: Record<string, unknown> = { $set: validation.data };
          const unset: Record<string, 1> = {};
          if (validation.unsetTransactionReference) unset.transactionReference = 1;
          if (validation.unsetNotes) unset.notes = 1;
          if (Object.keys(unset).length) update.$unset = unset;

          const payment = await Payment.findOneAndUpdate(
            validation.data.status === 'refunded'
              ? { _id: objectId, status: 'paid' }
              : { _id: objectId },
            update,
            { returnDocument: 'after', runValidators: true, session }
          );
          if (!payment) throw new Error('Payment is no longer refundable');
        },
        { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } }
      );
    } finally {
      await session.endSession();
    }

    const [payment, totals] = await Promise.all([
      paymentDetail(objectId).lean(),
      paymentTotals(objectId),
    ]);
    return NextResponse.json({ success: true, payment, totals });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'Payment is no longer refundable') {
      return NextResponse.json(
        { error: 'Payment is no longer refundable' },
        { status: 409 }
      );
    }
    console.error('Update payment error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to update payment' }, { status: 500 });
  }
}
