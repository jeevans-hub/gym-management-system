import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { getGymDayBounds, getGymDateKey } from '@/lib/attendance-dates';
import { expireMemberships } from '@/lib/membership-dates';
import { parseReportDateRange, reportRangeResponse } from '@/lib/report-dates';
import {
  mongoCurrencyToCents,
  paymentSummaryFromCents,
} from '@/lib/report-financials';
import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import Member from '@/models/Member';
import Membership from '@/models/Membership';
import Payment from '@/models/Payment';
import Trainer from '@/models/Trainer';

const EXPIRING_SOON_DAYS = 7;

export async function GET(request: NextRequest) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const rangeResult = parseReportDateRange(request.nextUrl.searchParams);
  if (!rangeResult.success) {
    return NextResponse.json({ error: rangeResult.error }, { status: 400 });
  }

  try {
    const range = rangeResult.data;
    const now = new Date();
    const expiringBefore = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);
    const todayBounds = getGymDayBounds(getGymDateKey(now));
    if (!todayBounds) throw new Error('Unable to determine the current gym day');

    await connectDB();
    await expireMemberships({}, now);

    const [memberRows, membershipRows, attendanceRows, paymentRows, trainerRows] =
      await Promise.all([
        Member.aggregate([
          {
            $group: {
              _id: null,
              totalMembers: { $sum: 1 },
              activeMembers: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
              inactiveMembers: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
              newMembersInRange: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $gte: ['$joiningDate', range.start] },
                        { $lt: ['$joiningDate', range.endExclusive] },
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
        ]),
        Membership.aggregate([
          {
            $group: {
              _id: null,
              activeMemberships: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
              expiredMemberships: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
              cancelledMemberships: {
                $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
              },
              expiringSoon: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$status', 'active'] },
                        { $gte: ['$endDate', now] },
                        { $lt: ['$endDate', expiringBefore] },
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
        ]),
        Attendance.aggregate([
          {
            $facet: {
              inRange: [
                { $match: { attendanceDate: { $gte: range.start, $lt: range.endExclusive } } },
                {
                  $group: {
                    _id: null,
                    attendanceCountInRange: { $sum: 1 },
                    uniqueMembers: { $addToSet: '$member' },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    attendanceCountInRange: 1,
                    uniqueMembersAttended: { $size: '$uniqueMembers' },
                  },
                },
              ],
              checkedInToday: [
                {
                  $match: {
                    attendanceDate: { $gte: todayBounds.start, $lt: todayBounds.end },
                    status: 'checked-in',
                  },
                },
                { $count: 'currentlyCheckedIn' },
              ],
            },
          },
        ]),
        Payment.aggregate([
          { $match: { paymentDate: { $gte: range.start, $lt: range.endExclusive } } },
          {
            $group: {
              _id: null,
              grossCents: { $sum: mongoCurrencyToCents('$amount') },
              refundedCents: {
                $sum: {
                  $cond: [
                    { $eq: ['$status', 'refunded'] },
                    mongoCurrencyToCents('$amount'),
                    0,
                  ],
                },
              },
              netCents: {
                $sum: {
                  $cond: [
                    { $eq: ['$status', 'paid'] },
                    mongoCurrencyToCents('$amount'),
                    0,
                  ],
                },
              },
              paymentCount: { $sum: 1 },
              paidCount: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] } },
              refundedCount: {
                $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] },
              },
            },
          },
          { $project: { _id: 0 } },
        ]),
        Trainer.aggregate([
          {
            $group: {
              _id: null,
              totalTrainers: { $sum: 1 },
              activeTrainers: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
              inactiveTrainers: {
                $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] },
              },
            },
          },
          { $project: { _id: 0 } },
        ]),
      ]);

    const attendanceFacet = attendanceRows[0] ?? {};
    const payments = paymentSummaryFromCents(paymentRows[0]);

    return NextResponse.json({
      range: reportRangeResponse(range),
      members: memberRows[0] ?? {
        totalMembers: 0,
        activeMembers: 0,
        inactiveMembers: 0,
        newMembersInRange: 0,
      },
      memberships: {
        ...(membershipRows[0] ?? {
          activeMemberships: 0,
          expiredMemberships: 0,
          cancelledMemberships: 0,
          expiringSoon: 0,
        }),
        expiringSoonWindowDays: EXPIRING_SOON_DAYS,
      },
      attendance: {
        attendanceCountInRange: attendanceFacet.inRange?.[0]?.attendanceCountInRange ?? 0,
        uniqueMembersAttended: attendanceFacet.inRange?.[0]?.uniqueMembersAttended ?? 0,
        currentlyCheckedIn: attendanceFacet.checkedInToday?.[0]?.currentlyCheckedIn ?? 0,
      },
      payments: {
        grossPaidInRange: payments.grossPaid,
        refundedAmountInRange: payments.refundedAmount,
        netRevenueInRange: payments.netRevenue,
        accountingPolicy: payments.accountingPolicy,
      },
      trainers: trainerRows[0] ?? {
        totalTrainers: 0,
        activeTrainers: 0,
        inactiveTrainers: 0,
      },
    });
  } catch (error) {
    console.error('Overview report error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to generate overview report' }, { status: 500 });
  }
}
