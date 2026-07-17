import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  password?: string;
  provider: 'local' | 'google' | 'github';
  providerId?: string;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  generationsUsed: number;
  generationsLimit: number;
  devices: string[];
  userType?: 'student' | 'professional';
  institution?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    password: { type: String },
    provider: { type: String, enum: ['local', 'google', 'github'], default: 'local' },
    providerId: { type: String },
    plan: { type: String, enum: ['free', 'pro', 'team', 'enterprise'], default: 'free' },
    generationsUsed: { type: Number, default: 0 },
    generationsLimit: { type: Number, default: 10 },
    devices: [{ type: String }],
    userType: { type: String, enum: ['student', 'professional'], default: 'professional' },
    institution: { type: String, trim: true },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
