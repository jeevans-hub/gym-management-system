import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminApiRequest } from '@/lib/admin-auth';
import { validateAdminUserUpdateInput } from '@/lib/admin-user-validation';
import { toSafeUser } from '@/lib/safe-user';
import User from '@/models/User';

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function validObjectId(id: string): string | null {
  const value = id.trim();
  return mongoose.isObjectIdOrHexString(value) ? value : null;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext<'/api/admin/users/[id]'>
) {
  const authorization = await authorizeAdminApiRequest();
  if (!authorization.authorized) return authorization.response;

  try {
    const objectId = validObjectId((await context.params).id);
    if (!objectId) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const user = await User.findById(objectId).select('name email role createdAt updatedAt');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ user: toSafeUser(user) });
  } catch (error: unknown) {
    console.error('Get admin user error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to retrieve user' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: RouteContext<'/api/admin/users/[id]'>
) {
  const authorization = await authorizeAdminApiRequest();
  if (!authorization.authorized) return authorization.response;

  try {
    const validation = validateAdminUserUpdateInput(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const objectId = validObjectId((await context.params).id);
    if (!objectId) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const existingUser = await User.findById(objectId).select('name email role createdAt updatedAt');
    if (!existingUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (
      validation.data.email &&
      (await User.exists({ _id: { $ne: objectId }, email: validation.data.email }))
    ) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }

    if (existingUser.role === 'admin' && validation.data.role === 'staff') {
      const anotherAdminExists = await User.exists({ _id: { $ne: objectId }, role: 'admin' });
      if (!anotherAdminExists) {
        return NextResponse.json(
          { error: 'The last remaining administrator cannot be demoted' },
          { status: 409 }
        );
      }
    }

    existingUser.set(validation.data);
    await existingUser.save();
    return NextResponse.json({ success: true, user: toSafeUser(existingUser) });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }
    console.error('Update admin user error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to update user' }, { status: 500 });
  }
}
