import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { getGymDayBounds } from '@/lib/attendance-dates';
import { memberLookup, parsePagination } from '@/lib/attendance-query';
import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import Member from '@/models/Member';
import '@/models/User';

export async function GET(
  request: NextRequest,
  context: RouteContext<'/api/members/[id]/attendance'>
) {
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

    const from = request.nextUrl.searchParams.get('from')?.trim();
    const to = request.nextUrl.searchParams.get('to')?.trim();
    const fromBounds = from ? getGymDayBounds(from) : null;
    const toBounds = to ? getGymDayBounds(to) : null;
    if ((from && !fromBounds) || (to && !toBounds)) {
      return NextResponse.json(
        { error: 'Date range values must use the YYYY-MM-DD format' },
        { status: 400 }
      );
    }
    if (fromBounds && toBounds && fromBounds.start > toBounds.start) {
      return NextResponse.json({ error: 'From date cannot be after to date' }, { status: 400 });
    }

    const { id } = await context.params;
    await connectDB();
    const memberDocument = await Member.findOne(memberLookup(id))
      .select('memberId firstName lastName phone')
      .lean();
    if (!memberDocument) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    const member = {
      memberId: memberDocument.memberId,
      firstName: memberDocument.firstName,
      lastName: memberDocument.lastName,
      phone: memberDocument.phone,
    };

    const filter: Record<string, unknown> = { member: memberDocument._id };
    if (fromBounds || toBounds) {
      filter.attendanceDate = {
        ...(fromBounds ? { $gte: fromBounds.start } : {}),
        ...(toBounds ? { $lt: toBounds.end } : {}),
      };
    }

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
      member,
      attendance,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(
      'Get member attendance error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json({ error: 'Unable to retrieve member attendance' }, { status: 500 });
  }
}
