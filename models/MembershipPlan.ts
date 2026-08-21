import mongoose, { Document, Model, Schema } from 'mongoose';

export const MEMBERSHIP_PLAN_STATUSES = ['active', 'inactive'] as const;

export type MembershipPlanStatus = (typeof MEMBERSHIP_PLAN_STATUSES)[number];

export interface IMembershipPlan extends Document {
  name: string;
  description?: string;
  durationMonths: number;
  price: number;
  status: MembershipPlanStatus;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipPlanSchema = new Schema<IMembershipPlan>(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      maxlength: [100, 'Plan name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    durationMonths: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [1, 'Duration must be at least one month'],
      validate: {
        validator: Number.isInteger,
        message: 'Duration must be a whole number of months',
      },
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    status: {
      type: String,
      enum: MEMBERSHIP_PLAN_STATUSES,
      default: 'active',
    },
  },
  { timestamps: true }
);

MembershipPlanSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

export default
  (mongoose.models.MembershipPlan as Model<IMembershipPlan>) ||
  mongoose.model<IMembershipPlan>('MembershipPlan', MembershipPlanSchema);
