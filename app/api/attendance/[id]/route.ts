import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { attendanceDetail } from '@/lib/attendance-query';
import connectDB from '@/lib/mongodb';

export async function GET(
  _request: NextRequest,
  context: RouteContext<'/api/attendance/[id]'>
) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    if (!mongoose.isObjectIdOrHexString(id.trim())) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }
    await connectDB();
    const attendance = await attendanceDetail(id.trim()).lean();
    if (!attendance) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }
    return NextResponse.json({ attendance });
  } catch (error) {
    console.error('Get attendance error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to retrieve attendance record' }, { status: 500 });
  }
}
