import mongoose, { Document, Model, Schema } from 'mongoose';
import Counter from '@/models/Counter';

export const MEMBER_GENDERS = ['male', 'female', 'other', 'prefer-not-to-say'] as const;
export const MEMBER_STATUSES = ['active', 'inactive'] as const;

export type MemberGender = (typeof MEMBER_GENDERS)[number];
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export interface IMember extends Document {
  memberId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  gender?: MemberGender;
  dateOfBirth?: Date;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  joiningDate: Date;
  status: MemberStatus;
  profileImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MemberSchema = new Schema<IMember>(
  {
    memberId: { type: String, required: true, unique: true, immutable: true, trim: true },
    firstName: { type: String, required: [true, 'First name is required'], trim: true },
    lastName: { type: String, required: [true, 'Last name is required'], trim: true },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
    },
    phone: { type: String, required: [true, 'Phone is required'], trim: true },
    gender: { type: String, enum: MEMBER_GENDERS },
    dateOfBirth: Date,
    address: { type: String, trim: true },
    emergencyContactName: { type: String, trim: true },
    emergencyContactPhone: { type: String, trim: true },
    joiningDate: { type: Date, default: Date.now },
    status: { type: String, enum: MEMBER_STATUSES, default: 'active' },
    profileImage: { type: String, trim: true },
  },
  { timestamps: true }
);

MemberSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);

export async function generateMemberId(): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    'memberId',
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `GYM-${counter.sequence.toString().padStart(6, '0')}`;
}

export default
  (mongoose.models.Member as Model<IMember>) ||
  mongoose.model<IMember>('Member', MemberSchema);
