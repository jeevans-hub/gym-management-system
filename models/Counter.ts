import mongoose, { Model, Schema } from 'mongoose';

export interface ICounter {
  _id: string;
  sequence: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  sequence: { type: Number, required: true, default: 0 },
});

export default
  (mongoose.models.Counter as Model<ICounter>) ||
  mongoose.model<ICounter>('Counter', CounterSchema);
