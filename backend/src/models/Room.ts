// // /models/Room.ts
// import { Schema, model } from 'mongoose';

// const roomSchema = new Schema({
//   roomId: { type: String, required: true, unique: true },
//   code: { type: String, default: '' },
//   language: { type: String, default: 'javascript' },
//   participants: { type: [String], default: [] }, // user IDs
// }, { timestamps: true });

// export default model('Room', roomSchema);
import { Schema, model, Document } from 'mongoose';

export interface IFile {
  id: string;
  name: string;
  language: string;
}

export interface IRoom extends Document {
  roomId: string;
  code: string;
  language: string;
  participants: string[];
  lastActivity: Date;
  files: IFile[];
}

const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java',
  'cpp', 'c', 'go', 'rust', 'php', 'ruby',
  'html', 'css', 'bash', 'csharp'
];

const fileSchema = new Schema<IFile>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  language: { type: String, default: 'javascript' },
});

const roomSchema = new Schema<IRoom>({
  roomId: { type: String, required: true, unique: true, trim: true, index: true },
  code: { type: String, default: '' },
  language: { type: String, default: 'javascript' },
  participants: { type: [String], default: [] },
  lastActivity: { type: Date, default: Date.now },
  files: { type: [fileSchema], default: [] },
}, { timestamps: true });

roomSchema.pre('save', function (next) {
  this.lastActivity = new Date();
  next();
});

export default model<IRoom>('Room', roomSchema);