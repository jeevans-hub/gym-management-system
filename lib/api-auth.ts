import { cookies } from 'next/headers';
import { verifyToken, type JWTPayload } from '@/lib/auth';

export async function authenticateApiRequest(): Promise<JWTPayload | null> {
  const token = (await cookies()).get('token')?.value;

  if (!token) return null;

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}
