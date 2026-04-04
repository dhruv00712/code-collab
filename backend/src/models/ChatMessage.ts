// import mongoose from 'mongoose';

// const chatMessageSchema = new mongoose.Schema({
//   roomId: String,
//   user: String,
//   message: String,
//   timestamp: {
//     type: Date,
//     default: Date.now,
//   },
// });

// export default mongoose.model('ChatMessage', chatMessageSchema);

import { Schema, model, Document } from 'mongoose';

export interface IChatMessage extends Document {
  roomId: string;
  user: string;
  message: string;
  timestamp: Date;
}

const chatMessageSchema = new Schema<IChatMessage>({
  roomId: {
    type: String,
    required: true,
    index: true  // faster chat history queries
  },
  user: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Message too long']
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export default model<IChatMessage>('ChatMessage', chatMessageSchema);