import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { expireMemberships } from '@/lib/membership-dates';
import { validateMembershipUpdate } from '@/lib/membership-validation';
import connectDB from '@/lib/mongodb';
import Membership from '@/models/Membership';

function validObjectId(id: string): string | null {
  const value = id.trim();
  return mongoose.isObjectIdOrHexString(value) ? value : null;
}

function membershipDetail(id: string) {
  return Membership.findById(id)
    .populate('member', 'memberId firstName lastName')
    .populate('plan', 'name durationMonths')
    .populate('createdBy', 'name role');
}

export async function GET(
  _request: NextRequest,
  context: RouteContext<'/api/memberships/[id]'>
) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const objectId = validObjectId(id);
    if (!objectId) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    await connectDB();
    await expireMemberships({ _id: objectId });
    const membership = await membershipDetail(objectId).lean();
    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }
    return NextResponse.json({ membership });
  } catch (error) {
    console.error(
      'Get membership error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json({ error: 'Unable to retrieve membership' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<'/api/memberships/[id]'>
) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const validation = validateMembershipUpdate(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { id } = await context.params;
    const objectId = validObjectId(id);
    if (!objectId) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    await connectDB();
    await expireMemberships({ _id: objectId });
    const existingMembership = await Membership.findById(objectId).select('status').lean();
    if (!existingMembership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }
    if (validation.data.status === 'cancelled' && existingMembership.status !== 'active') {
      return NextResponse.json(
        { error: 'Only an active membership can be cancelled' },
        { status: 409 }
      );
    }

    const update: Record<string, unknown> = { $set: validation.data };
    if (validation.unsetNotes) update.$unset = { notes: 1 };
    const membership = await Membership.findOneAndUpdate(
      validation.data.status === 'cancelled'
        ? { _id: objectId, status: 'active' }
        : { _id: objectId },
      update,
      { new: true, runValidators: true }
    );
    if (!membership) {
      return NextResponse.json(
        { error: 'Membership is no longer active' },
        { status: 409 }
      );
    }
    await membership.populate([
      { path: 'member', select: 'memberId firstName lastName' },
      { path: 'plan', select: 'name durationMonths' },
      { path: 'createdBy', select: 'name role' },
    ]);

    return NextResponse.json({ success: true, membership });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    console.error(
      'Update membership error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json({ error: 'Unable to update membership' }, { status: 500 });
  }
}
