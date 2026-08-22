import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { validateTrainerInput } from '@/lib/trainer-validation';
import Trainer, {
  generateTrainerId,
  TRAINER_STATUSES,
  type TrainerStatus,
} from '@/models/Trainer';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 100;
const MAX_SPECIALIZATION_LENGTH = 100;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export async function GET(request: NextRequest) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const pageValue = Number(request.nextUrl.searchParams.get('page') ?? 1);
    const limitValue = Number(request.nextUrl.searchParams.get('limit') ?? DEFAULT_LIMIT);
    if (
      !Number.isInteger(pageValue) ||
      pageValue < 1 ||
      !Number.isInteger(limitValue) ||
      limitValue < 1
    ) {
      return NextResponse.json(
        { error: 'Page and limit must be positive integers' },
        { status: 400 }
      );
    }

    const page = pageValue;
    const limit = Math.min(limitValue, MAX_LIMIT);
    const search = request.nextUrl.searchParams.get('search')?.trim();
    const status = request.nextUrl.searchParams.get('status')?.trim();
    const specialization = request.nextUrl.searchParams.get('specialization')?.trim();

    if (search && search.length > MAX_SEARCH_LENGTH) {
      return NextResponse.json(
        { error: `Search cannot exceed ${MAX_SEARCH_LENGTH} characters` },
        { status: 400 }
      );
    }
    if (status && !TRAINER_STATUSES.includes(status as TrainerStatus)) {
      return NextResponse.json(
        { error: 'Status must be active or inactive' },
        { status: 400 }
      );
    }
    if (specialization && specialization.length > MAX_SPECIALIZATION_LENGTH) {
      return NextResponse.json(
        { error: `Specialization cannot exceed ${MAX_SPECIALIZATION_LENGTH} characters` },
        { status: 400 }
      );
    }

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (specialization) {
      filter.specialization = new RegExp(`^${escapeRegex(specialization)}$`, 'i');
    }
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        'trainerId',
        'firstName',
        'lastName',
        'email',
        'phone',
        'specialization',
      ].map((field) => ({ [field]: pattern }));
    }

    await connectDB();
    const [trainers, total] = await Promise.all([
      Trainer.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Trainer.countDocuments(filter),
    ]);

    return NextResponse.json({
      trainers,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List trainers error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to retrieve trainers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const validation = validateTrainerInput(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    await connectDB();
    if (validation.data.email && await Trainer.exists({ email: validation.data.email })) {
      return NextResponse.json(
        { error: 'A trainer with this email already exists' },
        { status: 409 }
      );
    }

    const trainer = await Trainer.create({
      ...validation.data,
      trainerId: await generateTrainerId(),
    });
    return NextResponse.json({ success: true, trainer }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { error: 'A trainer with these unique details already exists' },
        { status: 409 }
      );
    }
    console.error('Create trainer error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to create trainer' }, { status: 500 });
  }
}
