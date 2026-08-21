import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { normalizeAttendanceDate } from '@/lib/attendance-dates';
import { attendanceDetail, isDuplicateKeyError, memberLookup } from '@/lib/attendance-query';
import { validateAttendanceCheckIn } from '@/lib/attendance-validation';
import { expireMemberships } from '@/lib/membership-dates';
import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import Member from '@/models/Member';
import Membership from '@/models/Membership';

export async function POST(request: NextRequest) {
  const authenticatedUser = await authenticateApiRequest();
  if (!authenticatedUser) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const validation = validateAttendanceCheckIn(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    await connectDB();
    const member = await Member.findOne(memberLookup(validation.data.memberId)).select('_id').lean();
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const checkInAt = new Date();
    await expireMemberships({ member: member._id }, checkInAt);
    const eligible = await Membership.exists({
      member: member._id,
      status: 'active',
      startDate: { $lte: checkInAt },
      endDate: { $gte: checkInAt },
    });
    if (!eligible) {
      return NextResponse.json(
        { error: 'Member does not have an active membership' },
        { status: 409 }
      );
    }

    await Attendance.init();
    const attendance = await Attendance.create({
      member: member._id,
      checkInAt,
      attendanceDate: normalizeAttendanceDate(checkInAt),
      status: 'checked-in',
      recordedBy: authenticatedUser.userId,
      notes: validation.data.notes,
    });
    const safeAttendance = await attendanceDetail(attendance._id.toString()).lean();

    return NextResponse.json({ success: true, attendance: safeAttendance }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { error: 'Member is already checked in for this gym day' },
        { status: 409 }
      );
    }
    console.error('Attendance check-in error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to check in member' }, { status: 500 });
  }
}
