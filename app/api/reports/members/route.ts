import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { expireMemberships } from '@/lib/membership-dates';
import { parseReportDateRange, reportRangeResponse } from '@/lib/report-dates';
import {
  escapeReportRegex,
  parseEnumFilter,
  parseReportPagination,
  parseReportSearch,
  reportPaginationResponse,
} from '@/lib/report-query';
import connectDB from '@/lib/mongodb';
import Member, { MEMBER_STATUSES, type MemberStatus } from '@/models/Member';
import Membership from '@/models/Membership';
import MembershipPlan from '@/models/MembershipPlan';

export async function GET(request: NextRequest) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const pagination = parseReportPagination(params);
  if (!pagination.success) {
    return NextResponse.json({ error: pagination.error }, { status: 400 });
  }
  const search = parseReportSearch(params);
  if (!search.success) return NextResponse.json({ error: search.error }, { status: 400 });
  const status = parseEnumFilter(params, 'status', MEMBER_STATUSES);
  if (!status.success) return NextResponse.json({ error: status.error }, { status: 400 });
  const range = parseReportDateRange(params);
  if (!range.success) return NextResponse.json({ error: range.error }, { status: 400 });

  try {
    await connectDB();
    await expireMemberships();

    const { page, limit } = pagination.data;
    const dateRange = range.data;
    const match: Record<string, unknown> = {
      joiningDate: { $gte: dateRange.start, $lt: dateRange.endExclusive },
    };
    if (status.data) match.status = status.data as MemberStatus;
    if (search.data) {
      const pattern = new RegExp(escapeReportRegex(search.data), 'i');
      match.$or = ['memberId', 'firstName', 'lastName', 'phone', 'email'].map((field) => ({
        [field]: pattern,
      }));
    }

    const [result] = await Member.aggregate([
      { $match: match },
      {
        $facet: {
          rows: [
            { $sort: { joiningDate: -1, _id: -1 } },
            { $skip: (page - 1) * limit },
            { $limit: limit },
            {
              $lookup: {
                from: Membership.collection.name,
                let: { memberId: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ['$member', '$$memberId'] },
                      status: 'active',
                    },
                  },
                  { $sort: { endDate: -1 } },
                  { $limit: 1 },
                  {
                    $lookup: {
                      from: MembershipPlan.collection.name,
                      localField: 'plan',
                      foreignField: '_id',
                      as: 'planRow',
                    },
                  },
                  { $set: { planRow: { $first: '$planRow' } } },
                  {
                    $project: {
                      _id: 0,
                      planName: '$planRow.name',
                      startDate: 1,
                      endDate: 1,
                      status: 1,
                    },
                  },
                ],
                as: 'currentMembershipRows',
              },
            },
            {
              $project: {
                _id: 0,
                memberId: 1,
                fullName: { $trim: { input: { $concat: ['$firstName', ' ', '$lastName'] } } },
                phone: 1,
                email: 1,
                joiningDate: 1,
                status: 1,
                currentMembership: { $first: '$currentMembershipRows' },
              },
            },
          ],
          metadata: [{ $count: 'total' }],
          summary: [
            {
              $group: {
                _id: null,
                active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
                inactive: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
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
      summary: result?.summary?.[0] ?? { active: 0, inactive: 0 },
    });
  } catch (error) {
    console.error('Member report error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to generate member report' }, { status: 500 });
  }
}
