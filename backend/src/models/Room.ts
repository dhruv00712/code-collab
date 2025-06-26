// /models/Room.ts
import { Schema, model } from 'mongoose';

const roomSchema = new Schema({
  roomId: { type: String, required: true, unique: true },
  code: { type: String, default: '' },
  language: { type: String, default: 'javascript' },
  participants: { type: [String], default: [] }, // user IDs
}, { timestamps: true });

export default model('Room', roomSchema);
