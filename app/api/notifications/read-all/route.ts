import { NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';
type NotificationFilter = NonNullable<Parameters<typeof Notification.updateMany>[0]>;

export async function PUT() {
  const user = await authenticateApiRequest();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    await connectDB();
    const result = await Notification.updateMany(
      { $or: [{ recipientUser: user.userId }, { recipientRole: user.role }, { recipientUser: { $exists: false }, recipientRole: { $exists: false } }], isRead: false } as unknown as NotificationFilter,
      { $set: { isRead: true, readAt: new Date() } }
    );
    return NextResponse.json({ success: true, updatedCount: result.modifiedCount });
  } catch (error) {
    console.error('Read all notifications error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to mark notifications as read' }, { status: 500 });
  }
}
