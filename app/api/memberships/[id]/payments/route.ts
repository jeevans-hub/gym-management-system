import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import {
  getMembershipPaymentTotals,
  parsePaymentPagination,
} from '@/lib/payment-query';
import connectDB from '@/lib/mongodb';
import Membership from '@/models/Membership';
import Payment from '@/models/Payment';
import '@/models/Member';
import '@/models/MembershipPlan';
import '@/models/User';

export async function GET(
  request: NextRequest,
  context: RouteContext<'/api/memberships/[id]/payments'>
) {
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

    const { id } = await context.params;
    if (!mongoose.isObjectIdOrHexString(id)) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    await connectDB();
    const membership = await Membership.findById(id)
      .select('member plan startDate endDate status priceAtPurchase')
      .populate('member', 'memberId firstName lastName phone -_id')
      .populate('plan', 'name durationMonths status -_id')
      .lean();
    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    const { page, limit } = pagination;
    const [payments, total, totals] = await Promise.all([
      Payment.find({ membership: membership._id })
        .select('-__v')
        .sort({ paymentDate: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('recordedBy', 'name email role -_id')
        .lean(),
      Payment.countDocuments({ membership: membership._id }),
      getMembershipPaymentTotals(membership._id, membership.priceAtPurchase),
    ]);

    return NextResponse.json({
      membership,
      ...totals,
      payments,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(
      'Get membership payments error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json({ error: 'Unable to retrieve membership payments' }, { status: 500 });
  }
}
