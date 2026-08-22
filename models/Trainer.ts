import mongoose, { Document, Model, Schema } from 'mongoose';
import Counter from '@/models/Counter';

export const TRAINER_GENDERS = ['male', 'female', 'other', 'prefer-not-to-say'] as const;
export const TRAINER_STATUSES = ['active', 'inactive'] as const;

export type TrainerGender = (typeof TRAINER_GENDERS)[number];
export type TrainerStatus = (typeof TRAINER_STATUSES)[number];

export interface ITrainer extends Document {
  trainerId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  gender?: TrainerGender;
  specialization: string;
  experienceYears: number;
  joiningDate: Date;
  salary?: number;
  status: TrainerStatus;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  profileImage?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TrainerSchema = new Schema<ITrainer>(
  {
    trainerId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      trim: true,
      match: [/^TRN-\d{6}$/, 'Trainer ID must use the TRN-000001 format'],
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [100, 'First name cannot exceed 100 characters'],
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [100, 'Last name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      maxlength: [254, 'Email cannot exceed 254 characters'],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      match: [/^\+?[0-9]{7,15}$/, 'Please enter a valid phone number'],
    },
    gender: { type: String, enum: TRAINER_GENDERS },
    specialization: {
      type: String,
      required: [true, 'Specialization is required'],
      trim: true,
      maxlength: [100, 'Specialization cannot exceed 100 characters'],
    },
    experienceYears: {
      type: Number,
      default: 0,
      min: [0, 'Experience cannot be negative'],
      max: [80, 'Experience cannot exceed 80 years'],
      validate: { validator: Number.isFinite, message: 'Experience must be a finite number' },
    },
    joiningDate: { type: Date, required: true, default: Date.now },
    salary: {
      type: Number,
      min: [0, 'Salary cannot be negative'],
      max: [100_000_000, 'Salary cannot exceed 100000000'],
      validate: [
        { validator: Number.isFinite, message: 'Salary must be a finite number' },
        {
          validator(value: number) {
            return Math.abs(value * 100 - Math.round(value * 100)) < 1e-8;
          },
          message: 'Salary cannot have more than two decimal places',
        },
      ],
    },
    status: {
      type: String,
      enum: TRAINER_STATUSES,
      required: true,
      default: 'active',
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    emergencyContactName: {
      type: String,
      trim: true,
      maxlength: [100, 'Emergency contact name cannot exceed 100 characters'],
    },
    emergencyContactPhone: {
      type: String,
      trim: true,
      match: [/^\+?[0-9]{7,15}$/, 'Please enter a valid emergency contact phone number'],
    },
    profileImage: {
      type: String,
      trim: true,
      maxlength: [2048, 'Profile image path cannot exceed 2048 characters'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  { timestamps: true, versionKey: false }
);

TrainerSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);
TrainerSchema.index({ status: 1, createdAt: -1 });
TrainerSchema.index({ specialization: 1, createdAt: -1 });

export async function generateTrainerId(): Promise<string> {
  const counter = await Counter.findByIdAndUpdate(
    'trainerId',
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `TRN-${counter.sequence.toString().padStart(6, '0')}`;
}

export default
  (mongoose.models.Trainer as Model<ITrainer>) ||
  mongoose.model<ITrainer>('Trainer', TrainerSchema);
