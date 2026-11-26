import mongoose, { Schema, Document } from 'mongoose';

interface IFastingVow {
  _id: mongoose.Types.ObjectId;
  title: string;
  targetDays: number;
  createdAt: Date;
}

export interface IFastingProfile extends Document {
  userId: string;
  /** Total make-up days the user owes (user-set; completed count derived from logs) */
  qadaOwed: number;
  kaffarah: {
    active: boolean;
    /** 60 for Ramadan-violation kaffarah, 3 for oath kaffarah — user chooses */
    targetDays: number;
    startDate?: string;
  };
  vows: mongoose.Types.DocumentArray<IFastingVow & Document>;
  createdAt: Date;
  updatedAt: Date;
}

const fastingProfileSchema = new Schema<IFastingProfile>(
  {
    userId: { type: String, required: true, unique: true },
    qadaOwed: { type: Number, default: 0, min: 0, max: 10_000 },
    kaffarah: {
      active: { type: Boolean, default: false },
      targetDays: { type: Number, default: 60, min: 1, max: 10_000 },
      startDate: { type: String },
    },
    vows: {
      type: [
        {
          title: { type: String, required: true, maxlength: 100 },
          targetDays: { type: Number, required: true, min: 1, max: 10_000 },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model<IFastingProfile>('FastingProfile', fastingProfileSchema);
