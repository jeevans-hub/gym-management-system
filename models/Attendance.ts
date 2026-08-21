import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export const ATTENDANCE_STATUSES = ['checked-in', 'checked-out'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface IAttendance extends Document {
  member: Types.ObjectId;
  checkInAt: Date;
  checkOutAt?: Date;
  attendanceDate: Date;
  status: AttendanceStatus;
  recordedBy: Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    member: { type: Schema.Types.ObjectId, ref: 'Member', required: true, immutable: true },
    checkInAt: { type: Date, required: true, immutable: true },
    checkOutAt: {
      type: Date,
      validate: {
        validator(this: IAttendance, value?: Date) {
          return !value || !this.checkInAt || value.getTime() > this.checkInAt.getTime();
        },
        message: 'Check-out time must be after check-in time',
      },
    },
    attendanceDate: { type: Date, required: true, immutable: true },
    status: { type: String, enum: ATTENDANCE_STATUSES, default: 'checked-in', required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    notes: { type: String, trim: true, maxlength: [500, 'Notes cannot exceed 500 characters'] },
  },
  { timestamps: true }
);

AttendanceSchema.pre('validate', function validateAttendanceState() {
  if (this.status === 'checked-out' && !this.checkOutAt) {
    this.invalidate('checkOutAt', 'Checked-out attendance requires a check-out time');
  }
  if (this.status === 'checked-in' && this.checkOutAt) {
    this.invalidate('status', 'Checked-in attendance cannot have a check-out time');
  }
});

AttendanceSchema.index(
  { member: 1, attendanceDate: 1 },
  { unique: true, name: 'one_attendance_per_member_per_gym_day' }
);
AttendanceSchema.index({ attendanceDate: -1, checkInAt: -1 });
AttendanceSchema.index({ status: 1, attendanceDate: -1 });

export default
  (mongoose.models.Attendance as Model<IAttendance>) ||
  mongoose.model<IAttendance>('Attendance', AttendanceSchema);
