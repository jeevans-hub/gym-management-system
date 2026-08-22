import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  try {
    await connectDB();
    const adminExists = await User.exists({ role: 'admin' });
    return NextResponse.json({ requiresSetup: !adminExists });
  } catch (error: unknown) {
    console.error('Setup status error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to determine setup status' }, { status: 500 });
  }
}
