import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export const PAYMENT_METHODS = ['cash', 'upi', 'card', 'bank-transfer', 'other'] as const;
export const PAYMENT_STATUSES = ['paid', 'refunded'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface IPayment extends Document {
  member: Types.ObjectId;
  membership: Types.ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionReference?: string;
  notes?: string;
  recordedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    member: {
      type: Schema.Types.ObjectId,
      ref: 'Member',
      required: [true, 'Member is required'],
      immutable: true,
    },
    membership: {
      type: Schema.Types.ObjectId,
      ref: 'Membership',
      required: [true, 'Membership is required'],
      immutable: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      immutable: true,
      min: [0.01, 'Amount must be greater than zero'],
      validate: [
        {
          validator: Number.isFinite,
          message: 'Amount must be finite',
        },
        {
          validator(value: number) {
            return Math.abs(value * 100 - Math.round(value * 100)) < 1e-8;
          },
          message: 'Amount cannot have more than two decimal places',
        },
      ],
    },
    paymentDate: {
      type: Date,
      required: [true, 'Payment date is required'],
      immutable: true,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: [true, 'Payment method is required'],
      immutable: true,
    },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'paid',
      required: true,
    },
    transactionReference: {
      type: String,
      trim: true,
      maxlength: [150, 'Transaction reference cannot exceed 150 characters'],
      validate: {
        validator(value?: string) {
          return !value || !/[\u0000-\u001F\u007F]/.test(value);
        },
        message: 'Transaction reference cannot contain control characters',
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recording user is required'],
      immutable: true,
    },
  },
  { timestamps: true }
);

PaymentSchema.index({ membership: 1, paymentDate: -1 });
PaymentSchema.index({ member: 1, paymentDate: -1 });
PaymentSchema.index({ status: 1, paymentDate: -1 });
PaymentSchema.index({ paymentMethod: 1, paymentDate: -1 });

export default
  (mongoose.models.Payment as Model<IPayment>) ||
  mongoose.model<IPayment>('Payment', PaymentSchema);
