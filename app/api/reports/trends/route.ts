import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { parseReportDateRange, reportRangeResponse, REPORT_TIME_ZONE } from '@/lib/report-dates';
import { mongoCurrencyToCents, reportCurrency } from '@/lib/report-financials';
import { parseEnumFilter } from '@/lib/report-query';
import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import Member from '@/models/Member';
import Payment from '@/models/Payment';

const TREND_INTERVALS = ['daily', 'monthly'] as const;
type TrendInterval = (typeof TREND_INTERVALS)[number];

function bucketFormat(interval: TrendInterval): string {
  return interval === 'monthly' ? '%Y-%m' : '%Y-%m-%d';
}

function expectedBuckets(from: string, to: string, interval: TrendInterval): string[] {
  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number);
  const [toYear, toMonth, toDay] = to.split('-').map(Number);
  const cursor = new Date(Date.UTC(fromYear, fromMonth - 1, interval === 'monthly' ? 1 : fromDay));
  const end = new Date(Date.UTC(toYear, toMonth - 1, interval === 'monthly' ? 1 : toDay));
  const buckets: string[] = [];

  while (cursor <= end) {
    buckets.push(cursor.toISOString().slice(0, interval === 'monthly' ? 7 : 10));
    if (interval === 'monthly') cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return buckets;
}

export async function GET(request: NextRequest) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const range = parseReportDateRange(params);
  if (!range.success) return NextResponse.json({ error: range.error }, { status: 400 });
  const intervalResult = parseEnumFilter(params, 'interval', TREND_INTERVALS);
  if (!intervalResult.success) {
    return NextResponse.json({ error: intervalResult.error }, { status: 400 });
  }
  const interval = intervalResult.data ?? 'daily';

  try {
    await connectDB();
    const dateRange = range.data;
    const format = bucketFormat(interval);
    const dateKey = (field: string) => ({
      $dateToString: { date: field, format, timezone: REPORT_TIME_ZONE },
    });

    const [memberRows, attendanceRows, paymentRows] = await Promise.all([
      Member.aggregate([
        { $match: { joiningDate: { $gte: dateRange.start, $lt: dateRange.endExclusive } } },
        { $group: { _id: dateKey('$joiningDate'), value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Attendance.aggregate([
        { $match: { attendanceDate: { $gte: dateRange.start, $lt: dateRange.endExclusive } } },
        { $group: { _id: dateKey('$attendanceDate'), value: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Payment.aggregate([
        {
          $match: {
            paymentDate: { $gte: dateRange.start, $lt: dateRange.endExclusive },
            status: 'paid',
          },
        },
        { $group: { _id: dateKey('$paymentDate'), valueCents: { $sum: mongoCurrencyToCents('$amount') } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const membersByBucket = new Map(memberRows.map((row) => [row._id, row.value]));
    const attendanceByBucket = new Map(attendanceRows.map((row) => [row._id, row.value]));
    const paymentsByBucket = new Map(paymentRows.map((row) => [row._id, row.valueCents]));
    const points = expectedBuckets(dateRange.from, dateRange.to, interval).map((bucket) => ({
      bucket,
      newMembers: membersByBucket.get(bucket) ?? 0,
      attendanceCount: attendanceByBucket.get(bucket) ?? 0,
      netRevenue: reportCurrency(paymentsByBucket.get(bucket)),
    }));

    return NextResponse.json({
      range: reportRangeResponse(dateRange),
      interval,
      points,
      accountingPolicy: 'Net revenue includes paid records only; refunded records contribute zero.',
    });
  } catch (error) {
    console.error('Trends report error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to generate trends report' }, { status: 500 });
  }
}
