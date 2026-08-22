import mongoose, { Model, Schema, Types } from 'mongoose';

export const FIRST_ADMIN_SETUP_ID = 'first-admin-setup';

export interface ISetupState {
  _id: string;
  lockToken?: string;
  lockExpiresAt?: Date;
  completedAt?: Date | null;
  createdAdmin?: Types.ObjectId;
}

const SetupStateSchema = new Schema<ISetupState>(
  {
    _id: { type: String, required: true },
    lockToken: { type: String, select: false },
    lockExpiresAt: Date,
    completedAt: { type: Date, default: null },
    createdAdmin: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { versionKey: false }
);

export default
  (mongoose.models.SetupState as Model<ISetupState>) ||
  mongoose.model<ISetupState>('SetupState', SetupStateSchema);
