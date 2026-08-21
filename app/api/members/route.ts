import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { validateMemberInput } from '@/lib/member-validation';
import Member, { generateMemberId, MEMBER_STATUSES } from '@/models/Member';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const pageValue = Number(request.nextUrl.searchParams.get('page') ?? 1);
    const limitValue = Number(request.nextUrl.searchParams.get('limit') ?? DEFAULT_LIMIT);
    if (!Number.isInteger(pageValue) || pageValue < 1 || !Number.isInteger(limitValue) || limitValue < 1) {
      return NextResponse.json({ error: 'Page and limit must be positive integers' }, { status: 400 });
    }
    const page = pageValue;
    const limit = Math.min(limitValue, MAX_LIMIT);
    const search = request.nextUrl.searchParams.get('search')?.trim();
    const status = request.nextUrl.searchParams.get('status')?.trim();
    if (status && !MEMBER_STATUSES.includes(status as 'active' | 'inactive')) {
      return NextResponse.json({ error: 'Status must be active or inactive' }, { status: 400 });
    }

    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = ['memberId', 'firstName', 'lastName', 'email', 'phone'].map((field) => ({ [field]: pattern }));
    }

    await connectDB();
    const [members, total] = await Promise.all([
      Member.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Member.countDocuments(filter),
    ]);

    return NextResponse.json({ members, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('List members error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to retrieve members' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await authenticateApiRequest())) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const validation = validateMemberInput(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 400 });
    }

    await connectDB();
    if (validation.data.email && await Member.exists({ email: validation.data.email })) {
      return NextResponse.json({ error: 'A member with this email already exists' }, { status: 409 });
    }

    const member = await Member.create({ ...validation.data, memberId: await generateMemberId() });
    return NextResponse.json({ success: true, member }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (typeof error === 'object' && error && 'code' in error && error.code === 11000) {
      return NextResponse.json({ error: 'A member with these unique details already exists' }, { status: 409 });
    }
    console.error('Create member error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Unable to create member' }, { status: 500 });
  }
}
