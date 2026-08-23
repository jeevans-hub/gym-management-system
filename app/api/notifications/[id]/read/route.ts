import { NextRequest, NextResponse } from 'next/server';
import { authenticateApiRequest } from '@/lib/api-auth';
import { findVisibleNotification } from '@/lib/notification-query';

export async function PUT(_request: NextRequest, context: RouteContext<'/api/notifications/[id]/read'>) {
  const user = await authenticateApiRequest();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const notification = await findVisibleNotification((await context.params).id, user);
    if (!notification) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }
    return NextResponse.json({ success: true, notification: notification.toObject() });
  } catch (error) {
    console.error('Read notification error:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ error: 'Unable to mark notification as read' }, { status: 500 });
  }
}
