import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { validateFirstAdminInput } from '@/lib/admin-user-validation';
import { createToken, hashPassword } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { toSafeUser } from '@/lib/safe-user';
import SetupState, { FIRST_ADMIN_SETUP_ID } from '@/models/SetupState';
import User from '@/models/User';

const SETUP_LOCK_DURATION_MS = 30_000;

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function setupUnavailableResponse() {
  return NextResponse.json(
    { error: 'Initial administrator setup is no longer available' },
    { status: 409 }
  );
}

export async function handleFirstAdminSetup(request: Request) {
  let lockToken: string | null = null;
  let adminCreated = false;

  try {
    const validation = validateFirstAdminInput(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const name = validation.data.name as string;
    const email = validation.data.email as string;
    const password = validation.data.password as string;
    await connectDB();

    lockToken = randomUUID();
    const now = new Date();
    try {
      const lock = await SetupState.findOneAndUpdate(
        {
          _id: FIRST_ADMIN_SETUP_ID,
          completedAt: null,
          $or: [
            { lockToken: { $exists: false } },
            { lockToken: null },
            { lockExpiresAt: { $lte: now } },
          ],
        },
        {
          $set: {
            lockToken,
            lockExpiresAt: new Date(now.getTime() + SETUP_LOCK_DURATION_MS),
          },
          $setOnInsert: { _id: FIRST_ADMIN_SETUP_ID, completedAt: null },
        },
        { upsert: true, returnDocument: 'after' }
      );
      if (!lock) return setupUnavailableResponse();
    } catch (error) {
      if (isDuplicateKeyError(error)) return setupUnavailableResponse();
      throw error;
    }

    const existingAdmin = await User.exists({ role: 'admin' });
    if (existingAdmin) {
      await SetupState.updateOne(
        { _id: FIRST_ADMIN_SETUP_ID, lockToken },
        {
          $set: { completedAt: new Date(), createdAdmin: existingAdmin._id },
          $unset: { lockToken: 1, lockExpiresAt: 1 },
        }
      );
      return setupUnavailableResponse();
    }

    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
    });
    adminCreated = true;

    await SetupState.updateOne(
      { _id: FIRST_ADMIN_SETUP_ID, lockToken },
      {
        $set: { completedAt: new Date(), createdAdmin: user._id },
        $unset: { lockToken: 1, lockExpiresAt: 1 },
      }
    );

    const token = createToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });
    const response = NextResponse.json(
      { success: true, user: toSafeUser(user) },
      { status: 201 }
    );
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    return response;
  } catch (error: unknown) {
    if (lockToken && !adminCreated) {
      await SetupState.updateOne(
        { _id: FIRST_ADMIN_SETUP_ID, lockToken, completedAt: null },
        { $unset: { lockToken: 1, lockExpiresAt: 1 } }
      ).catch(() => undefined);
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: 'A user with this email already exists' }, { status: 409 });
    }
    console.error(
      'Initial administrator setup error:',
      error instanceof Error ? error.name : 'UnknownError'
    );
    return NextResponse.json(
      { error: 'Unable to complete initial administrator setup' },
      { status: 500 }
    );
  }
}
