import mongoose, { Document, Model, Schema, Types } from 'mongoose';
import Counter from '@/models/Counter';

export const NOTIFICATION_TYPES = [
  'membership-expiring', 'membership-expired', 'payment-due', 'payment-received',
  'payment-refunded', 'attendance', 'trainer', 'system', 'warning', 'success', 'info',
] as const;
export const NOTIFICATION_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export const NOTIFICATION_RECIPIENT_ROLES = ['admin', 'staff'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];
export type NotificationRecipientRole = (typeof NOTIFICATION_RECIPIENT_ROLES)[number];

export interface INotification extends Document {
  notificationId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  category?: string;
  recipientRole?: NotificationRecipientRole;
  recipientUser?: Types.ObjectId;
  relatedMember?: Types.ObjectId;
  relatedMembership?: Types.ObjectId;
  relatedPayment?: Types.ObjectId;
  relatedTrainer?: Types.ObjectId;
  isRead: boolean;
  readAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    notificationId: { type: String, required: true, unique: true, immutable: true, trim: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    priority: { type: String, enum: NOTIFICATION_PRIORITIES, required: true, default: 'medium' },
    category: { type: String, trim: true, maxlength: 80 },
    recipientRole: { type: String, enum: NOTIFICATION_RECIPIENT_ROLES },
    recipientUser: { type: Schema.Types.ObjectId, ref: 'User' },
    relatedMember: { type: Schema.Types.ObjectId, ref: 'Member' },
    relatedMembership: { type: Schema.Types.ObjectId, ref: 'Membership' },
    relatedPayment: { type: Schema.Types.ObjectId, ref: 'Payment' },
    relatedTrainer: { type: Schema.Types.ObjectId, ref: 'Trainer' },
    isRead: { type: Boolean, default: false, required: true },
    readAt: Date,
    expiresAt: Date,
  },
  { timestamps: true, versionKey: false }
);

NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ isRead: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, priority: 1, createdAt: -1 });

export async function generateNotificationId(): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    'notificationId',
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `NOT-${counter.sequence.toString().padStart(6, '0')}`;
}

NotificationSchema.pre('validate', async function assignNotificationId() {
  if (!this.notificationId) this.notificationId = await generateNotificationId();
});

export default
  (mongoose.models.Notification as Model<INotification>) ||
  mongoose.model<INotification>('Notification', NotificationSchema);
