import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';
type NotificationFilter = NonNullable<Parameters<typeof Notification.findOne>[0]>;

function filterFor(id: string, user: { userId: string; role: string }) {
  const identity = mongoose.isObjectIdOrHexString(id) ? { $or: [{ _id: id }, { notificationId: id.toUpperCase() }] } : { notificationId: id.toUpperCase() };
  return { ...identity, $and: [{ $or: [{ recipientUser: user.userId }, { recipientRole: user.role }, { recipientUser: { $exists: false }, recipientRole: { $exists: false } }] }] };
}
async function findNotification(id: string, user: { userId: string; role: string }) {
  await connectDB();
  return Notification.findOne(filterFor(id, user) as unknown as NotificationFilter);
}

export async function GET(_request: NextRequest, context: RouteContext<'/api/notifications/[id]'>) {
  const user = await authenticateApiRequest();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const notification = await findNotification((await context.params).id, user);
    if (!notification) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    return NextResponse.json({ notification: notification.toObject() });
  } catch (error) {
    console.error('Get notification error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to retrieve notification' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext<'/api/notifications/[id]'>) {
  const user = await authenticateApiRequest();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const notification = await findNotification((await context.params).id, user);
    if (!notification) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    await notification.deleteOne();
    return NextResponse.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to delete notification' }, { status: 500 });
  }
}
