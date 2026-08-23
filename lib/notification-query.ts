import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';
type NotificationFilter = NonNullable<Parameters<typeof Notification.findOne>[0]>;

export async function findVisibleNotification(id: string, user: { userId: string; role: string }) {
  const value = id.trim();
  const identity = mongoose.isObjectIdOrHexString(value)
    ? { $or: [{ _id: value }, { notificationId: value.toUpperCase() }] }
    : { notificationId: value.toUpperCase() };
  await connectDB();
  return Notification.findOne({
    ...identity,
    $and: [{ $or: [{ recipientUser: user.userId }, { recipientRole: user.role }, { recipientUser: { $exists: false }, recipientRole: { $exists: false } }] }],
  } as unknown as NotificationFilter);
}
