import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { validateMemberInput } from '@/lib/member-validation';
import Member from '@/models/Member';

function memberFilter(id: string) {
  const decoded = decodeURIComponent(id).trim();
  return mongoose.isValidObjectId(decoded)
    ? { $or: [{ _id: decoded }, { memberId: decoded.toUpperCase() }] }
    : { memberId: decoded.toUpperCase() };
}

export async function GET(_request: NextRequest, context: RouteContext<'/api/members/[id]'>) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    await connectDB();
    const { id } = await context.params;
    const member = await Member.findOne(memberFilter(id)).lean();
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    return NextResponse.json({ member });
  } catch (error) {
    console.error('Get member error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to retrieve member' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, context: RouteContext<'/api/members/[id]'>) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const validation = validateMemberInput(await request.json(), true);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
    }
    await connectDB();
    const { id } = await context.params;
    const update: Record<string, unknown> = { $set: validation.data };
    if (validation.unsetFields.length) {
      update.$unset = Object.fromEntries(validation.unsetFields.map((field) => [field, 1]));
    }
    const member = await Member.findOneAndUpdate(memberFilter(id), update, { new: true, runValidators: true });
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    return NextResponse.json({ success: true, member });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    if (typeof error === 'object' && error && 'code' in error && error.code === 11000) {
      return NextResponse.json({ error: 'A member with this email already exists' }, { status: 409 });
    }
    console.error('Update member error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to update member' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext<'/api/members/[id]'>) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    await connectDB();
    const { id } = await context.params;
    const member = await Member.findOneAndDelete(memberFilter(id));
    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: 'Member deleted successfully' });
  } catch (error) {
    console.error('Delete member error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to delete member' }, { status: 500 });
  }
}
