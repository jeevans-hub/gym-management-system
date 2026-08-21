import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { getGymDayBounds } from '@/lib/attendance-dates';
import { escapeRegex, memberLookup, parsePagination } from '@/lib/attendance-query';
import connectDB from '@/lib/mongodb';
import Attendance, { ATTENDANCE_STATUSES } from '@/models/Attendance';
import Member from '@/models/Member';

export async function GET(request: NextRequest) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const pagination = parsePagination(
      request.nextUrl.searchParams.get('page'),
      request.nextUrl.searchParams.get('limit')
    );
    if (!pagination) {
      return NextResponse.json({ error: 'Page and limit must be positive integers' }, { status: 400 });
    }

    const date = request.nextUrl.searchParams.get('date')?.trim();
    const status = request.nextUrl.searchParams.get('status')?.trim();
    const memberValue = request.nextUrl.searchParams.get('member')?.trim();
    const search = request.nextUrl.searchParams.get('search')?.trim();

    if (status && !ATTENDANCE_STATUSES.includes(status as 'checked-in' | 'checked-out')) {
      return NextResponse.json(
        { error: 'Status must be checked-in or checked-out' },
        { status: 400 }
      );
    }
    const dayBounds = date ? getGymDayBounds(date) : null;
    if (date && !dayBounds) {
      return NextResponse.json({ error: 'Date must use the YYYY-MM-DD format' }, { status: 400 });
    }

    await connectDB();
    const filter: Record<string, unknown> = {};
    if (dayBounds) filter.attendanceDate = { $gte: dayBounds.start, $lt: dayBounds.end };
    if (status) filter.status = status;

    const memberConditions: Record<string, unknown>[] = [];
    if (memberValue) {
      const member = await Member.findOne(memberLookup(memberValue)).select('_id').lean();
      if (!member) {
        return NextResponse.json({ attendance: [], ...pagination, total: 0, totalPages: 0 });
      }
      memberConditions.push({ member: member._id });
    }
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      const memberIds = await Member.find({
        $or: [
          { memberId: pattern },
          { firstName: pattern },
          { lastName: pattern },
          { phone: pattern },
        ],
      }).distinct('_id');
      memberConditions.push({ member: { $in: memberIds } });
    }
    if (memberConditions.length === 1) Object.assign(filter, memberConditions[0]);
    else if (memberConditions.length > 1) filter.$and = memberConditions;

    const { page, limit } = pagination;
    const [attendance, total] = await Promise.all([
      Attendance.find(filter)
        .select('-__v')
        .sort({ checkInAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('member', 'memberId firstName lastName phone -_id')
        .populate('recordedBy', 'name role -_id')
        .lean(),
      Attendance.countDocuments(filter),
    ]);

    return NextResponse.json({
      attendance,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List attendance error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to retrieve attendance' }, { status: 500 });
  }
}
