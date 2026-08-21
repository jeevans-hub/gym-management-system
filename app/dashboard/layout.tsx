import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import DashboardSidebar from './DashboardSidebar';
import DashboardHeader from './DashboardHeader';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('token');

  if (!tokenCookie) {
    redirect('/login');
  }

  let decoded;
  try {
    decoded = verifyToken(tokenCookie.value);
  } catch (error) {
    redirect('/login');
  }

  await connectDB();
  const user = await User.findById(decoded.userId);

  if (!user) {
    redirect('/login');
  }

  const safeUser: User = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />
      <div className="ml-64">
        <DashboardHeader user={safeUser} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
