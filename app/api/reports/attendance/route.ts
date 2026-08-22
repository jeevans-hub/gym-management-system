import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { parseReportDateRange, reportRangeResponse, REPORT_TIME_ZONE } from '@/lib/report-dates';
import {
  escapeReportRegex,
  parseEnumFilter,
  parseReportPagination,
  parseReportSearch,
  reportPaginationResponse,
} from '@/lib/report-query';
import connectDB from '@/lib/mongodb';
import Attendance, {
  ATTENDANCE_STATUSES,
  type AttendanceStatus,
} from '@/models/Attendance';
import Member from '@/models/Member';

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
  const status = parseEnumFilter(params, 'status', ATTENDANCE_STATUSES);
  if (!status.success) return NextResponse.json({ error: status.error }, { status: 400 });
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
    const match: Record<string, unknown> = {
      attendanceDate: { $gte: dateRange.start, $lt: dateRange.endExclusive },
    };
    if (status.data) match.status = status.data as AttendanceStatus;
    if (member.supplied) {
      if (!member.id) {
        return NextResponse.json({
          rows: [],
          ...reportPaginationResponse(page, limit, 0),
          range: reportRangeResponse(dateRange),
          summary: { totalAttendanceRecords: 0, uniqueMembers: 0, checkedIn: 0, checkedOut: 0 },
        });
      }
      match.member = member.id;
    }

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
      { $set: { memberRow: { $first: '$memberRow' } } },
    ];
    if (search.data) {
      const pattern = new RegExp(escapeReportRegex(search.data), 'i');
      pipeline.push({
        $match: {
          $or: ['memberRow.memberId', 'memberRow.firstName', 'memberRow.lastName', 'memberRow.phone'].map(
            (field) => ({ [field]: pattern })
          ),
        },
      });
    }
    pipeline.push({
      $facet: {
        rows: [
          { $sort: { checkInAt: -1, _id: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $project: {
              _id: 0,
              gymDate: {
                $dateToString: { date: '$attendanceDate', format: '%Y-%m-%d', timezone: REPORT_TIME_ZONE },
              },
              memberId: '$memberRow.memberId',
              memberName: {
                $trim: { input: { $concat: ['$memberRow.firstName', ' ', '$memberRow.lastName'] } },
              },
              checkIn: '$checkInAt',
              checkOut: '$checkOutAt',
              status: 1,
            },
          },
        ],
        metadata: [{ $count: 'total' }],
        summary: [
          {
            $group: {
              _id: null,
              uniqueMemberIds: { $addToSet: '$member' },
              checkedIn: { $sum: { $cond: [{ $eq: ['$status', 'checked-in'] }, 1, 0] } },
              checkedOut: { $sum: { $cond: [{ $eq: ['$status', 'checked-out'] }, 1, 0] } },
            },
          },
          {
            $project: {
              _id: 0,
              uniqueMembers: { $size: '$uniqueMemberIds' },
              checkedIn: 1,
              checkedOut: 1,
            },
          },
        ],
      },
    });

    const [result] = await Attendance.aggregate(pipeline);
    const total = result?.metadata?.[0]?.total ?? 0;
    const summary = result?.summary?.[0] ?? { uniqueMembers: 0, checkedIn: 0, checkedOut: 0 };
    return NextResponse.json({
      rows: result?.rows ?? [],
      ...reportPaginationResponse(page, limit, total),
      range: reportRangeResponse(dateRange),
      summary: { totalAttendanceRecords: total, ...summary },
    });
  } catch (error) {
    console.error('Attendance report error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to generate attendance report' }, { status: 500 });
  }
}
