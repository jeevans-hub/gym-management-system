import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { validateTrainerInput } from '@/lib/trainer-validation';
import Trainer from '@/models/Trainer';

function trainerFilter(id: string) {
  const value = id.trim();
  return mongoose.isObjectIdOrHexString(value)
    ? { $or: [{ _id: value }, { trainerId: value.toUpperCase() }] }
    : { trainerId: value.toUpperCase() };
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext<'/api/trainers/[id]'>
) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    await connectDB();
    const trainer = await Trainer.findOne(trainerFilter(id)).lean();
    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }
    return NextResponse.json({ trainer });
  } catch (error) {
    console.error('Get trainer error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to retrieve trainer' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<'/api/trainers/[id]'>
) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const validation = validateTrainerInput(await request.json(), true);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const { id } = await context.params;
    await connectDB();
    const existing = await Trainer.findOne(trainerFilter(id)).select('_id').lean();
    if (!existing) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }
    if (
      validation.data.email &&
      await Trainer.exists({ _id: { $ne: existing._id }, email: validation.data.email })
    ) {
      return NextResponse.json(
        { error: 'A trainer with this email already exists' },
        { status: 409 }
      );
    }

    const update: Record<string, unknown> = { $set: validation.data };
    if (validation.unsetFields.length) {
      update.$unset = Object.fromEntries(validation.unsetFields.map((field) => [field, 1]));
    }
    const trainer = await Trainer.findByIdAndUpdate(existing._id, update, {
      new: true,
      runValidators: true,
    });
    return NextResponse.json({ success: true, trainer });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { error: 'A trainer with this email already exists' },
        { status: 409 }
      );
    }
    console.error('Update trainer error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to update trainer' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext<'/api/trainers/[id]'>
) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    await connectDB();
    const trainer = await Trainer.findOneAndDelete(trainerFilter(id));
    if (!trainer) {
      return NextResponse.json({ error: 'Trainer not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Trainer deleted successfully' });
  } catch (error) {
    console.error('Delete trainer error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to delete trainer' }, { status: 500 });
  }
}
