import { handleFirstAdminSetup } from '@/lib/first-admin-setup';

export async function POST(request: Request) {
  return handleFirstAdminSetup(request);
}
