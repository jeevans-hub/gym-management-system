import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { parseReportDateRange, reportRangeResponse } from '@/lib/report-dates';
import {
  mongoCurrencyToCents,
  paymentSummaryFromCents,
} from '@/lib/report-financials';
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
import Membership from '@/models/Membership';
import MembershipPlan from '@/models/MembershipPlan';
import Payment, {
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type PaymentMethod,
  type PaymentStatus,
} from '@/models/Payment';

async function resolveMember(value: string | undefined) {
  if (!value) return { supplied: false as const };
  const normalized = value.trim();
  if (!mongoose.isObjectIdOrHexString(normalized) && !/^GYM-\d{6}$/.test(normalized.toUpperCase())) {
    return { supplied: true as const, valid: false as const };
  }
  const member = await Member.findOne(
    mongoose.isObjectIdOrHexString(normalized)
      ? { _id: normalized }
      : { memberId: normalized.toUpperCase() }
  )
    .select('_id')
    .lean();
  return { supplied: true as const, valid: true as const, id: member?._id };
}

export async function GET(request: NextRequest) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const pagination = parseReportPagination(params);
  if (!pagination.success) return NextResponse.json({ error: pagination.error }, { status: 400 });
  const search = parseReportSearch(params);
  if (!search.success) return NextResponse.json({ error: search.error }, { status: 400 });
  const method = parseEnumFilter(params, 'method', PAYMENT_METHODS);
  if (!method.success) return NextResponse.json({ error: method.error }, { status: 400 });
  const status = parseEnumFilter(params, 'status', PAYMENT_STATUSES);
  if (!status.success) return NextResponse.json({ error: status.error }, { status: 400 });
  const membership = parseObjectIdFilter(params, 'membership');
  if (!membership.success) {
    return NextResponse.json({ error: membership.error }, { status: 400 });
  }
  const range = parseReportDateRange(params);
  if (!range.success) return NextResponse.json({ error: range.error }, { status: 400 });

  try {
    await connectDB();
    const member = await resolveMember(params.get('member')?.trim());
    if (member.supplied && !member.valid) {
      return NextResponse.json({ error: 'member must be a valid Member ID' }, { status: 400 });
    }

    const { page, limit } = pagination.data;
    const dateRange = range.data;
    if (member.supplied && !member.id) {
      return NextResponse.json({
        rows: [],
        ...reportPaginationResponse(page, limit, 0),
        range: reportRangeResponse(dateRange),
        summary: paymentSummaryFromCents(undefined),
      });
    }

    const match: Record<string, unknown> = {
      paymentDate: { $gte: dateRange.start, $lt: dateRange.endExclusive },
    };
    if (member.id) match.member = member.id;
    if (membership.data) match.membership = membership.data;
    if (method.data) match.paymentMethod = method.data as PaymentMethod;
    if (status.data) match.status = status.data as PaymentStatus;

    const pipeline: mongoose.PipelineStage[] = [
      { $match: match },
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
          from: Membership.collection.name,
          localField: 'membership',
          foreignField: '_id',
          as: 'membershipRow',
        },
      },
      { $set: { memberRow: { $first: '$memberRow' }, membershipRow: { $first: '$membershipRow' } } },
      {
        $lookup: {
          from: MembershipPlan.collection.name,
          localField: 'membershipRow.plan',
          foreignField: '_id',
          as: 'planRow',
        },
      },
      { $set: { planRow: { $first: '$planRow' } } },
    ];
    if (search.data) {
      const pattern = new RegExp(escapeReportRegex(search.data), 'i');
      pipeline.push({
        $match: {
          $or: [
            'memberRow.memberId',
            'memberRow.firstName',
            'memberRow.lastName',
            'memberRow.phone',
            'transactionReference',
            'planRow.name',
          ].map((field) => ({ [field]: pattern })),
        },
      });
    }
    pipeline.push({
      $facet: {
        rows: [
          { $sort: { paymentDate: -1, _id: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              paymentDate: 1,
              memberId: '$memberRow.memberId',
              memberName: {
                $trim: { input: { $concat: ['$memberRow.firstName', ' ', '$memberRow.lastName'] } },
              },
              plan: '$planRow.name',
              amount: 1,
              method: '$paymentMethod',
              status: 1,
              transactionReference: 1,
            },
          },
        ],
        metadata: [{ $count: 'total' }],
        summary: [
          {
            $group: {
              _id: null,
              grossCents: { $sum: mongoCurrencyToCents('$amount') },
              refundedCents: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'refunded'] }, mongoCurrencyToCents('$amount'), 0],
                },
              },
              netCents: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'paid'] }, mongoCurrencyToCents('$amount'), 0],
                },
              },
              paymentCount: { $sum: 1 },
              paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
              refundedCount: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } },
            },
          },
          { $project: { _id: 0 } },
        ],
      },
    });

    const [result] = await Payment.aggregate(pipeline);
    const total = result?.metadata?.[0]?.total ?? 0;
    return NextResponse.json({
      rows: result?.rows ?? [],
      ...reportPaginationResponse(page, limit, total),
      range: reportRangeResponse(dateRange),
      summary: paymentSummaryFromCents(result?.summary?.[0]),
    });
  } catch (error) {
    console.error('Payment report error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to generate payment report' }, { status: 500 });
  }
}
