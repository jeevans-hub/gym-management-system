import mongoose, { Model, Schema, Types } from 'mongoose';

export const GYM_SETTINGS_ID = 'gym-settings';
export const GYM_CURRENCIES = ['INR'] as const;
export const GYM_TIMEZONES = ['Asia/Kolkata'] as const;

export type GymCurrency = (typeof GYM_CURRENCIES)[number];
export type GymTimezone = (typeof GYM_TIMEZONES)[number];

export interface IGymSettings {
  _id: string;
  gymName: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  currency: GymCurrency;
  timezone: GymTimezone;
  openingTime: string;
  closingTime: string;
  membershipExpiryWarningDays: number;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GymSettingsSchema = new Schema<IGymSettings>(
  {
    _id: { type: String, required: true, default: GYM_SETTINGS_ID },
    gymName: { type: String, required: true, trim: true, maxlength: 120 },
    logo: { type: String, trim: true, maxlength: 2048 },
    address: { type: String, trim: true, maxlength: 500 },
    phone: { type: String, trim: true, maxlength: 16 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
    currency: { type: String, enum: GYM_CURRENCIES, default: 'INR', required: true },
    timezone: {
      type: String,
      enum: GYM_TIMEZONES,
      default: 'Asia/Kolkata',
      required: true,
    },
    openingTime: { type: String, default: '06:00', required: true },
    closingTime: { type: String, default: '22:00', required: true },
    membershipExpiryWarningDays: {
      type: Number,
      default: 7,
      min: 0,
      max: 365,
      required: true,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default
  (mongoose.models.GymSettings as Model<IGymSettings>) ||
  mongoose.model<IGymSettings>('GymSettings', GymSettingsSchema);
