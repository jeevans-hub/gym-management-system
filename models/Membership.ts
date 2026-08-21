import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export const MEMBERSHIP_STATUSES = ['active', 'expired', 'cancelled'] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export interface IMembership extends Document {
  member: Types.ObjectId;
  plan: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: MembershipStatus;
  priceAtPurchase: number;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<IMembership>(
  {
    member: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: [true, 'Member is required'],
      immutable: true,
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: 'MembershipPlan',
      required: [true, 'Membership plan is required'],
      immutable: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      immutable: true,
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      immutable: true,
    },
    status: {
      type: String,
      enum: MEMBERSHIP_STATUSES,
      default: 'active',
      required: true,
    },
    priceAtPurchase: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0, 'Purchase price cannot be negative'],
      immutable: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creating user is required'],
      immutable: true,
    },
  },
  { timestamps: true }
);

MembershipSchema.index(
  { member: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
    name: 'one_active_membership_per_member',
  }
);
MembershipSchema.index({ member: 1, createdAt: -1 });
MembershipSchema.index({ plan: 1 });
MembershipSchema.index({ status: 1, endDate: 1 });

export default
  (mongoose.models.Membership as Model<IMembership>) ||
  mongoose.model<IMembership>('Membership', MembershipSchema);
