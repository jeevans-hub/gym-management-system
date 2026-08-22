import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminApiRequest } from '@/lib/admin-auth';
import { USER_ROLES, validateAdminUserCreateInput, type UserRole } from '@/lib/admin-user-validation';
import { hashPassword } from '@/lib/auth';
import { toSafeUser } from '@/lib/safe-user';
import User from '@/models/User';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdminApiRequest();
  if (!authorization.authorized) return authorization.response;

  try {
    const page = Number(request.nextUrl.searchParams.get('page') ?? 1);
    const requestedLimit = Number(request.nextUrl.searchParams.get('limit') ?? DEFAULT_LIMIT);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(requestedLimit) || requestedLimit < 1) {
      return NextResponse.json({ error: 'Page and limit must be positive integers' }, { status: 400 });
    }
    const limit = Math.min(requestedLimit, MAX_LIMIT);
    const search = request.nextUrl.searchParams.get('search')?.trim() ?? '';
    const role = request.nextUrl.searchParams.get('role')?.trim() ?? '';
    if (search.length > 100) {
      return NextResponse.json({ error: 'Search must be 100 characters or fewer' }, { status: 400 });
    }
    if (role && !USER_ROLES.includes(role as UserRole)) {
      return NextResponse.json({ error: `Role must be one of: ${USER_ROLES.join(', ')}` }, { status: 400 });
    }

    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: pattern }, { email: pattern }];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name email role createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return NextResponse.json({
      users: users.map(toSafeUser),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: unknown) {
    console.error('List admin users error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to retrieve users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeAdminApiRequest();
  if (!authorization.authorized) return authorization.response;

  try {
    const validation = validateAdminUserCreateInput(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const email = validation.data.email as string;
    if (await User.exists({ email })) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }
    const user = await User.create({
      name: validation.data.name,
      email,
      password: await hashPassword(validation.data.password as string),
      role: validation.data.role,
    });
    return NextResponse.json({ success: true, user: toSafeUser(user) }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }
    console.error('Create admin user error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to create user' }, { status: 500 });
  }
}
