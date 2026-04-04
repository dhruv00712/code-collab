// import mongoose from 'mongoose';

// const userSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: [true, 'Name is required'],
//     },
//     email: {
//       type: String,
//       required: [true, 'Email is required'],
//       unique: true,
//     },
//     password: {
//       type: String,
//       required: [true, 'Password is required'],
//     },
//   },
//   { timestamps: true }
// );

// export const User = mongoose.model('User', userSchema);

import { Schema, model, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  provider: 'local' | 'google';
  avatar?: string;
  roomHistory: string[];
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name too short'],
      maxlength: [50, 'Name too long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // never return password in queries by default
    },
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    avatar: {
      type: String,
      default: '',
    },
    roomHistory: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export const User = model<IUser>('User', userSchema);