import { NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

interface AdminPrincipal {
  userId: string;
  email: string;
  role: 'admin';
}

export type AdminAuthorization =
  | { authorized: true; user: AdminPrincipal }
  | { authorized: false; response: NextResponse };

export async function authorizeAdminApiRequest(): Promise<AdminAuthorization> {
  const tokenUser = await authenticateApiRequest();
  if (!tokenUser) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    };
  }

  let currentUser;
  try {
    await connectDB();
    currentUser = await User.findById(tokenUser.userId).select('email role').lean();
  } catch (error: unknown) {
    console.error(
      'Admin authorization error:',
      error instanceof Error ? error.name : 'UnknownError'
    );
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Unable to authorize request' }, { status: 500 }),
    };
  }
  if (!currentUser) {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }),
    };
  }
  if (currentUser.role !== 'admin') {
    return {
      authorized: false,
      response: NextResponse.json({ error: 'Administrator access is required' }, { status: 403 }),
    };
  }

  return {
    authorized: true,
    user: { userId: currentUser._id.toString(), email: currentUser.email, role: 'admin' },
  };
}
