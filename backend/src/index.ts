import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import roomRoutes from './routes/roomRoutes';
import ChatMessage from './models/ChatMessage';
import Room from './models/Room';
import runRoutes from './routes/runRoutes';

dotenv.config();
console.log('Loaded JWT_SECRET:', process.env.JWT_SECRET);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 8000;
const MONGO_URL = process.env.MONGO_URL || '';

// 🔌 WebSocket events
io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);

  // Handle chat messages
  socket.on('send-message', async ({ roomId, user, message }) => {
    socket.to(roomId).emit('receive-message', { user, message });
    await ChatMessage.create({ roomId, user, message });
  });

  // Handle code updates + auto-save
  socket.on('code-change', async ({ roomId, code }) => {
    io.to(roomId).emit('code-change', { code });
    await Room.findOneAndUpdate({ roomId }, { code }, { upsert: true });
  });

  // Join a room and send saved data + chat history
  socket.on('join-room', async ({ roomId, userId }) => {
    if (!roomId || !userId) {
      console.warn('⚠️ join-room called with missing roomId or userId', { roomId, userId });
      return;
    }

    socket.join(roomId);
    console.log(`🔗 ${socket.id} joined room: ${roomId}`);

    try {
      let room = await Room.findOne({ roomId });

      if (!room) {
        room = await Room.create({
          roomId,
          participants: [userId],
          code: '',
          language: 'javascript',
        });
      } else {
        if (!room.participants.includes(userId)) {
          room.participants.push(userId);
          await room.save();
        }
      }

      // Send current room data
      socket.emit('load-room-data', {
        code: room.code || '',
        language: room.language || 'javascript',
      });

      // ✅ Send chat history
      const chatHistory = await ChatMessage.find({ roomId }).sort({ createdAt: 1 });
      socket.emit('load-chat-history', chatHistory);

    } catch (err: any) {
      console.error('❌ Failed to join room:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 User disconnected:', socket.id);
  });
});

// ✅ Middlewares
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// ✅ Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api', runRoutes);

app.get('/', (req, res) => {
  res.send('✅ Backend & WebSocket running...');
});

// Connect to MongoDB & start server
mongoose.connect(MONGO_URL)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🚨 Shutting down gracefully...');
  mongoose.connection.close()
    .then(() => {
      console.log('✅ MongoDB connection closed.');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Error closing MongoDB connection:', err.message);
      process.exit(1);
    });
});
