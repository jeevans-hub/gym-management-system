import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { validateMembershipPlanInput } from '@/lib/membership-plan-validation';
import MembershipPlan, { MEMBERSHIP_PLAN_STATUSES } from '@/models/MembershipPlan';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const CASE_INSENSITIVE_COLLATION = { locale: 'en', strength: 2 } as const;

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
    if (status && !MEMBERSHIP_PLAN_STATUSES.includes(status as 'active' | 'inactive')) {
      return NextResponse.json(
        { error: 'Status must be active or inactive' },
        { status: 400 }
      );
    }

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: pattern }, { description: pattern }];
    }

    await connectDB();
    const [plans, total] = await Promise.all([
      MembershipPlan.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      MembershipPlan.countDocuments(filter),
    ]);

    return NextResponse.json({
      plans,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(
      'List membership plans error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json({ error: 'Unable to retrieve membership plans' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const validation = validateMembershipPlanInput(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    await connectDB();
    if (
      validation.data.name &&
      (await MembershipPlan.findOne({ name: validation.data.name })
        .collation(CASE_INSENSITIVE_COLLATION)
        .select('_id')
        .lean())
    ) {
      return NextResponse.json(
        { error: 'A membership plan with this name already exists' },
        { status: 409 }
      );
    }

    const plan = await MembershipPlan.create(validation.data);
    return NextResponse.json({ success: true, plan }, { status: 201 });
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
      'Create membership plan error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json({ error: 'Unable to create membership plan' }, { status: 500 });
  }
}
