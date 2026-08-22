import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { expireMemberships } from '@/lib/membership-dates';
import { mongoCurrencyToCents, reportCurrency } from '@/lib/report-financials';
import {
  escapeReportRegex,
  parseEnumFilter,
  parseObjectIdFilter,
  parseReportPagination,
  parseReportSearch,
  reportPaginationResponse,
} from '@/lib/report-query';
import connectDB from '@/lib/mongodb';
import Member from '@/models/Member';
import Membership, { MEMBERSHIP_STATUSES } from '@/models/Membership';
import MembershipPlan from '@/models/MembershipPlan';
import Payment from '@/models/Payment';

export async function GET(request: NextRequest) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const pagination = parseReportPagination(params);
  if (!pagination.success) return NextResponse.json({ error: pagination.error }, { status: 400 });
  const search = parseReportSearch(params);
  if (!search.success) return NextResponse.json({ error: search.error }, { status: 400 });
  const status = parseEnumFilter(params, 'status', MEMBERSHIP_STATUSES);
  if (!status.success) return NextResponse.json({ error: status.error }, { status: 400 });
  const plan = parseObjectIdFilter(params, 'plan');
  if (!plan.success) return NextResponse.json({ error: plan.error }, { status: 400 });

  try {
    await connectDB();
    await expireMemberships();
    const { page, limit } = pagination.data;
    const match: Record<string, unknown> = {};
    if (status.data) match.status = status.data;
    if (plan.data) match.plan = plan.data;

    const pipeline: mongoose.PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: Payment.collection.name,
          let: { membershipId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$membership', '$$membershipId'] }, status: 'paid' } },
            { $group: { _id: null, totalPaidCents: { $sum: mongoCurrencyToCents('$amount') } } },
          ],
          as: 'paymentTotals',
        },
      },
      {
        $set: {
          priceCents: mongoCurrencyToCents('$priceAtPurchase'),
          totalPaidCents: { $ifNull: [{ $first: '$paymentTotals.totalPaidCents' }, 0] },
        },
      },
      { $set: { remainingCents: { $max: [{ $subtract: ['$priceCents', '$totalPaidCents'] }, 0] } } },
      { $match: { remainingCents: { $gt: 0 } } },
      {
        $lookup: {
          from: Member.collection.name,
          localField: 'member',
          foreignField: '_id',
          as: 'memberRow',
        },
      },
      {
        $lookup: {
          from: MembershipPlan.collection.name,
          localField: 'plan',
          foreignField: '_id',
          as: 'planRow',
        },
      },
      { $set: { memberRow: { $first: '$memberRow' }, planRow: { $first: '$planRow' } } },
    ];
    if (search.data) {
      const pattern = new RegExp(escapeReportRegex(search.data), 'i');
      pipeline.push({
        $match: {
          $or: ['memberRow.memberId', 'memberRow.firstName', 'memberRow.lastName', 'planRow.name'].map(
            (field) => ({ [field]: pattern })
          ),
        },
      });
    }
    pipeline.push({
      $facet: {
        rows: [
          { $sort: { remainingCents: -1, endDate: 1, _id: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              memberId: '$memberRow.memberId',
              memberName: {
                $trim: { input: { $concat: ['$memberRow.firstName', ' ', '$memberRow.lastName'] } },
              },
              plan: '$planRow.name',
              membershipStatus: '$status',
              priceAtPurchase: { $divide: ['$priceCents', 100] },
              totalPaid: { $divide: ['$totalPaidCents', 100] },
              remainingBalance: { $divide: ['$remainingCents', 100] },
              endDate: 1,
            },
          },
        ],
        metadata: [{ $count: 'total' }],
        summary: [
          {
            $group: {
              _id: null,
              totalPriceCents: { $sum: '$priceCents' },
              totalPaidCents: { $sum: '$totalPaidCents' },
              totalOutstandingCents: { $sum: '$remainingCents' },
            },
          },
          { $project: { _id: 0 } },
        ],
      },
    });

    const [result] = await Membership.aggregate(pipeline);
    const total = result?.metadata?.[0]?.total ?? 0;
    const summary = result?.summary?.[0];
    return NextResponse.json({
      rows: result?.rows ?? [],
      ...reportPaginationResponse(page, limit, total),
      summary: {
        membershipCount: total,
        totalPrice: reportCurrency(summary?.totalPriceCents),
        totalPaid: reportCurrency(summary?.totalPaidCents),
        totalOutstanding: reportCurrency(summary?.totalOutstandingCents),
        accountingPolicy: 'Only paid (non-refunded) payment records reduce outstanding balance.',
      },
    });
  } catch (error) {
    console.error('Outstanding report error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to generate outstanding balance report' }, { status: 500 });
  }
}
