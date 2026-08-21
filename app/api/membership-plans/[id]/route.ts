import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { validateMembershipPlanInput } from '@/lib/membership-plan-validation';
import MembershipPlan from '@/models/MembershipPlan';

const CASE_INSENSITIVE_COLLATION = { locale: 'en', strength: 2 } as const;

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function validObjectId(id: string): string | null {
  const value = id.trim();
  return mongoose.isObjectIdOrHexString(value) ? value : null;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext<'/api/membership-plans/[id]'>
) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const objectId = validObjectId(id);
    if (!objectId) {
      return NextResponse.json({ error: 'Membership plan not found' }, { status: 404 });
    }

    await connectDB();
    const plan = await MembershipPlan.findById(objectId).lean();
    if (!plan) {
      return NextResponse.json({ error: 'Membership plan not found' }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (error) {
    console.error(
      'Get membership plan error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json({ error: 'Unable to retrieve membership plan' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<'/api/membership-plans/[id]'>
) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const validation = validateMembershipPlanInput(await request.json(), true);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { id } = await context.params;
    const objectId = validObjectId(id);
    if (!objectId) {
      return NextResponse.json({ error: 'Membership plan not found' }, { status: 404 });
    }

    await connectDB();
    if (
      validation.data.name &&
      (await MembershipPlan.findOne({
        _id: { $ne: objectId },
        name: validation.data.name,
      })
        .collation(CASE_INSENSITIVE_COLLATION)
        .select('_id')
        .lean())
    ) {
      return NextResponse.json(
        { error: 'A membership plan with this name already exists' },
        { status: 409 }
      );
    }

    const update: Record<string, unknown> = { $set: validation.data };
    if (validation.unsetFields.length) {
      update.$unset = Object.fromEntries(validation.unsetFields.map((field) => [field, 1]));
    }

    const plan = await MembershipPlan.findByIdAndUpdate(objectId, update, {
      new: true,
      runValidators: true,
    });
    if (!plan) {
      return NextResponse.json({ error: 'Membership plan not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, plan });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { error: 'A membership plan with this name already exists' },
        { status: 409 }
      );
    }
    console.error(
      'Update membership plan error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json({ error: 'Unable to update membership plan' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<'/api/membership-plans/[id]'>
) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const objectId = validObjectId(id);
    if (!objectId) {
      return NextResponse.json({ error: 'Membership plan not found' }, { status: 404 });
    }

    await connectDB();
    const plan = await MembershipPlan.findByIdAndDelete(objectId);
    if (!plan) {
      return NextResponse.json({ error: 'Membership plan not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Membership plan deleted successfully' });
  } catch (error) {
    console.error(
      'Delete membership plan error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json({ error: 'Unable to delete membership plan' }, { status: 500 });
  }
}
