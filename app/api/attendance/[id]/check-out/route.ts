import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { attendanceDetail } from '@/lib/attendance-query';
import { validateEmptyAttendanceBody } from '@/lib/attendance-validation';
import connectDB from '@/lib/mongodb';
import Attendance from '@/models/Attendance';

export async function POST(
  request: NextRequest,
  context: RouteContext<'/api/attendance/[id]/check-out'>
) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const text = await request.text();
    const validation = validateEmptyAttendanceBody(text.trim() ? JSON.parse(text) : {});
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { id } = await context.params;
    if (!mongoose.isObjectIdOrHexString(id.trim())) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    await connectDB();
    const existing = await Attendance.findById(id.trim()).select('checkInAt status').lean();
    if (!existing) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }
    if (existing.status !== 'checked-in') {
      return NextResponse.json({ error: 'Attendance record is already checked out' }, { status: 409 });
    }

    const now = new Date();
    const checkOutAt = now.getTime() > existing.checkInAt.getTime()
      ? now
      : new Date(existing.checkInAt.getTime() + 1);
    const updated = await Attendance.findOneAndUpdate(
      { _id: existing._id, status: 'checked-in' },
      { $set: { checkOutAt, status: 'checked-out' } },
      { returnDocument: 'after', runValidators: true }
    );
    if (!updated) {
      return NextResponse.json({ error: 'Attendance record is already checked out' }, { status: 409 });
    }

    const attendance = await attendanceDetail(updated._id.toString()).lean();
    return NextResponse.json({ success: true, attendance });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error('Attendance check-out error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to check out member' }, { status: 500 });
  }
}
