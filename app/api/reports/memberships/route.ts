import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { expireMemberships } from '@/lib/membership-dates';
import { parseReportDateRange, reportRangeResponse } from '@/lib/report-dates';
import {
  parseBoundedInteger,
  parseEnumFilter,
  parseObjectIdFilter,
  parseReportPagination,
  reportPaginationResponse,
} from '@/lib/report-query';
import connectDB from '@/lib/mongodb';
import Member from '@/models/Member';
import Membership, {
  MEMBERSHIP_STATUSES,
  type MembershipStatus,
} from '@/models/Membership';
import MembershipPlan from '@/models/MembershipPlan';

const EXPIRING_SOON_DAYS = 7;
const MAX_EXPIRING_WINDOW_DAYS = 365;

export async function GET(request: NextRequest) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const pagination = parseReportPagination(params);
  if (!pagination.success) {
    return NextResponse.json({ error: pagination.error }, { status: 400 });
  }
  const status = parseEnumFilter(params, 'status', MEMBERSHIP_STATUSES);
  if (!status.success) return NextResponse.json({ error: status.error }, { status: 400 });
  const plan = parseObjectIdFilter(params, 'plan');
  if (!plan.success) return NextResponse.json({ error: plan.error }, { status: 400 });
  const expiringWithinDays = parseBoundedInteger(
    params,
    'expiringWithinDays',
    0,
    MAX_EXPIRING_WINDOW_DAYS
  );
  if (!expiringWithinDays.success) {
    return NextResponse.json({ error: expiringWithinDays.error }, { status: 400 });
  }
  if (expiringWithinDays.data !== undefined && status.data && status.data !== 'active') {
    return NextResponse.json(
      { error: 'expiringWithinDays can only be combined with active status' },
      { status: 400 }
    );
  }
  const range = parseReportDateRange(params);
  if (!range.success) return NextResponse.json({ error: range.error }, { status: 400 });

  try {
    const now = new Date();
    await connectDB();
    await expireMemberships({}, now);

    const { page, limit } = pagination.data;
    const dateRange = range.data;
    const match: Record<string, unknown> = {
      startDate: { $gte: dateRange.start, $lt: dateRange.endExclusive },
    };
    if (status.data) match.status = status.data as MembershipStatus;
    if (plan.data) match.plan = plan.data;
    if (expiringWithinDays.data !== undefined) {
      match.status = 'active';
      match.endDate = {
        $gte: now,
        $lt: new Date(now.getTime() + expiringWithinDays.data * 24 * 60 * 60 * 1000),
      };
    }

    const expiringSoonBefore = new Date(
      now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000
    );
    const [result] = await Membership.aggregate([
      { $match: match },
      {
        $facet: {
          rows: [
            { $sort: { startDate: -1, _id: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
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
            {
              $project: {
                _id: 0,
                memberId: '$memberRow.memberId',
                memberName: {
                  $trim: {
                    input: { $concat: ['$memberRow.firstName', ' ', '$memberRow.lastName'] },
                  },
                },
                plan: '$planRow.name',
                startDate: 1,
                endDate: 1,
                status: 1,
                priceAtPurchase: 1,
              },
            },
          ],
          metadata: [{ $count: 'total' }],
          summary: [
            {
              $group: {
                _id: null,
                active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                expiringSoon: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ['$status', 'active'] },
                          { $gte: ['$endDate', now] },
                          { $lt: ['$endDate', expiringSoonBefore] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
            { $project: { _id: 0 } },
          ],
        },
      },
    ]);

    const total = result?.metadata?.[0]?.total ?? 0;
    return NextResponse.json({
      rows: result?.rows ?? [],
      ...reportPaginationResponse(page, limit, total),
      range: reportRangeResponse(dateRange),
      summary: {
        ...(result?.summary?.[0] ?? { active: 0, expired: 0, cancelled: 0, expiringSoon: 0 }),
        expiringSoonWindowDays: EXPIRING_SOON_DAYS,
      },
    });
  } catch (error) {
    console.error('Membership report error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to generate membership report' }, { status: 500 });
  }
}
