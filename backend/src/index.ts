// import express from 'express';
// import mongoose from 'mongoose';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import http from 'http';
// import { Server as SocketIOServer } from 'socket.io';

// import authRoutes from './routes/authRoutes';
// import userRoutes from './routes/userRoutes';
// import roomRoutes from './routes/roomRoutes';
// import ChatMessage from './models/ChatMessage';
// import Room from './models/Room';
// import runRoutes from './routes/runRoutes';

// dotenv.config();
// console.log('Loaded JWT_SECRET:', process.env.JWT_SECRET);

// const app = express();
// const server = http.createServer(app);
// const io = new SocketIOServer(server, {
//   cors: {
//     origin: ['https://codeship.vercel.app', 'http://localhost:3000'],
//     methods: ['GET', 'POST'],
//     credentials: true,
//   },
// });

// const PORT = process.env.PORT || 8000;
// const MONGO_URL = process.env.MONGO_URL || '';

// // WebSocket events
// io.on('connection', (socket) => {
//   console.log('🟢 User connected:', socket.id);

//   // Handle chat messages
//   socket.on('send-message', async ({ roomId, user, message }) => {
//     socket.to(roomId).emit('receive-message', { user, message });
//     await ChatMessage.create({ roomId, user, message });
//   });

//   // Handle code updates + auto-save
//   socket.on('code-change', async ({ roomId, code }) => {
//     io.to(roomId).emit('code-change', { code });
//     await Room.findOneAndUpdate({ roomId }, { code }, { upsert: true });
//   });

//   // Join a room and send saved data + chat history
//   socket.on('join-room', async ({ roomId, userId }) => {
//     if (!roomId || !userId) {
//       console.warn('⚠️ join-room called with missing roomId or userId', { roomId, userId });
//       return;
//     }

//     socket.join(roomId);
//     console.log(`🔗 ${socket.id} joined room: ${roomId}`);

//     try {
//       let room = await Room.findOne({ roomId });

//       if (!room) {
//         room = await Room.create({
//           roomId,
//           participants: [userId],
//           code: '',
//           language: 'javascript',
//         });
//       } else {
//         if (!room.participants.includes(userId)) {
//           room.participants.push(userId);
//           await room.save();
//         }
//       }

//       // Send current room data
//       socket.emit('load-room-data', {
//         code: room.code || '',
//         language: room.language || 'javascript',
//       });

//       // Send chat history
//       const chatHistory = await ChatMessage.find({ roomId }).sort({ createdAt: 1 });
//       socket.emit('load-chat-history', chatHistory);

//     } catch (err: any) {
//       console.error('❌ Failed to join room:', err.message);
//     }
//   });

//   socket.on('disconnect', () => {
//     console.log('🔴 User disconnected:', socket.id);
//   });
// });

// //Middlewares
// app.use(cors({
//   origin: ['https://codeship.vercel.app', 'http://localhost:3000'],
//   credentials: true,
// }));
// app.use(express.json());

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/rooms', roomRoutes);
// app.use('/api', runRoutes);

// app.get('/', (req, res) => {
//   res.send('✅ Backend & WebSocket running...');
// });


// mongoose.connect(MONGO_URL)
//   .then(() => {
//     console.log('✅ Connected to MongoDB');
//     server.listen(PORT, () => {
//       console.log(`🚀 Server running at PORT ${PORT}`);
//     });
//   })
//   .catch((err) => {
//     console.error('❌ MongoDB connection failed:', err.message);
//     process.exit(1);
//   });

// //  shutdown
// process.on('SIGINT', () => {
//   console.log('🚨 Shutting down gracefully...');
//   mongoose.connection.close()
//     .then(() => {
//       console.log('✅ MongoDB connection closed.');
//       process.exit(0);
//     })
//     .catch(err => {
//       console.error('❌ Error closing MongoDB connection:', err.message);
//       process.exit(1);
//     });
// });


import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Server as SocketIOServer } from 'socket.io';

dotenv.config();
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import roomRoutes from './routes/roomRoutes';
import runRoutes from './routes/runRoutes';
import ChatMessage from './models/ChatMessage';
import Room from './models/Room';
import redis from './lib/redis';


// ─── Validate required env vars on startup ───────────────────────────────────
const REQUIRED_ENV = ['JWT_SECRET', 'MONGO_URL'];
REQUIRED_ENV.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

const PORT = process.env.PORT || 8000;
const MONGO_URL = process.env.MONGO_URL as string;
const IS_PROD = process.env.NODE_ENV === 'production';

const ALLOWED_ORIGINS = IS_PROD
  ? ['https://codeship.vercel.app']
  : ['http://localhost:3000', 'https://codeship.vercel.app'];

const app = express();
const server = http.createServer(app);

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new SocketIOServer(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ─── Security Middlewares ─────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── General Middlewares ──────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Global Rate Limiter ──────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api', runRoutes);

app.get('/', (req, res) => {
  res.json({
    status: '✅ Backend & WebSocket running',
    environment: IS_PROD ? 'production' : 'development',
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Unhandled error:', err);
  res.status(err.status || 500).json({
    message: IS_PROD ? 'Something went wrong' : err.message,
  });
});

// ─── Redis → MongoDB Sync every 30 seconds ───────────────────────────────────
setInterval(async () => {
  try {
    const keys = await redis.keys('room:*:code');
    for (const key of keys) {
      const roomId = key.split(':')[1];
      const code = await redis.get(key);
      if (code) {
        await Room.findOneAndUpdate(
          { roomId },
          { $set: { code } },          // only persist code - do NOT touch lastActivity or updatedAt
          { upsert: true, timestamps: false }  // timestamps:false prevents Mongoose from bumping updatedAt
        );
      }
    }
  } catch (err: any) {
    console.error('❌ Redis sync error:', err.message);
  }
}, 30000);

// ─── Socket.IO Events ────────────────────────────────────────────────────────
const roomUsers = new Map<string, Set<string>>();

io.on('connection', (socket) => {
  console.log('🟢 User connected:', socket.id);
  // Add file
  socket.on('add-file', async ({ roomId, file }) => {
    if (!roomId || !file) return;
    try {
      await Room.findOneAndUpdate(
        { roomId },
        { $push: { files: file } }
      );
      // init empty code in Redis
      await redis.set(`room:${roomId}:file:${file.id}`, '', 'EX', 60 * 60 * 24);
      io.to(roomId).emit('file-added', { file });
    } catch (err: any) {
      console.error('❌ Failed to add file:', err.message);
    }
  });

  // Switch file - send code for that file
  socket.on('switch-file', async ({ roomId, fileId }) => {
    if (!roomId || !fileId) return;
    try {
      const code = await redis.get(`room:${roomId}:file:${fileId}`) || '';
      socket.emit('file-code', { fileId, code });
    } catch (err: any) {
      console.error('❌ Failed to switch file:', err.message);
    }
  });

  // Delete file
  socket.on('delete-file', async ({ roomId, fileId }) => {
    if (!roomId || !fileId) return;
    try {
      await Room.findOneAndUpdate(
        { roomId },
        { $pull: { files: { id: fileId } } }
      );
      await redis.del(`room:${roomId}:file:${fileId}`);
      io.to(roomId).emit('file-deleted', { fileId });
    } catch (err: any) {
      console.error('❌ Failed to delete file:', err.message);
    }
  });

  // Cursor move
  socket.on('cursor-move', ({ roomId, userId, userName, position, color }) => {
    socket.to(roomId).emit('cursor-update', { userId, userName, position, color });
  });

  // Join room
  socket.on('join-room', async ({ roomId, userId, userName }) => {
    if (!roomId || !userId) {
      console.warn('⚠️ join-room missing roomId or userId');
      return;
    }

    socket.join(roomId);
    console.log(`🔗 ${socket.id} joined room: ${roomId}`);

    // Track online users
    if (!roomUsers.has(roomId)) roomUsers.set(roomId, new Set());
    roomUsers.get(roomId)!.add(userName || userId);
    io.to(roomId).emit('room-users', Array.from(roomUsers.get(roomId)!));

    try {
      let room = await Room.findOne({ roomId });

      if (!room) {
        room = await Room.create({
          roomId,
          participants: [userId],
          createdBy: userId, // first joiner is creator
          code: '',
          language: 'javascript',
        });
      } else {
        if (!room.participants.includes(userId)) {
          room.participants.push(userId);
          await room.save();
        }
      }

      // Load code from Redis first, fallback to MongoDB
      const cachedCode = await redis.get(`room:${roomId}:code`);

      socket.emit('load-room-data', {
        code: cachedCode || room.code || '',
        language: room.language || 'javascript',
        files: room.files || [],
      });

      const chatHistory = await ChatMessage.find({ roomId })
        .sort({ createdAt: 1 })
        .limit(100);
      socket.emit('load-chat-history', chatHistory);

    } catch (err: any) {
      console.error('❌ Failed to join room:', err.message);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  // Handle chat messages
  socket.on('send-message', async ({ roomId, user, message }) => {
    if (!roomId || !user || !message) return;
    const sanitizedMessage = String(message).slice(0, 2000);
    socket.to(roomId).emit('receive-message', { user, message: sanitizedMessage });
    try {
      await ChatMessage.create({ roomId, user, message: sanitizedMessage });
    } catch (err: any) {
      console.error('❌ Failed to save message:', err.message);
    }
  });

  // Handle code updates - save to Redis instantly
  socket.on('code-change', async ({ roomId, code, fileId }) => {
    if (!roomId) return;
    socket.to(roomId).emit('code-change', { code, fileId });
    try {
      const key = fileId
        ? `room:${roomId}:file:${fileId}`
        : `room:${roomId}:code`;
      await redis.set(key, code, 'EX', 60 * 60 * 24);
    } catch (err: any) {
      console.error('❌ Failed to save code to Redis:', err.message);
    }
  });

  // Typing indicator
  socket.on('typing', ({ roomId, user }) => {
    if (!roomId || !user) return;
    socket.to(roomId).emit('user-typing', { user });
  });

  // Language change
  socket.on('language-change', ({ roomId, language }) => {
    if (!roomId || !language) return;
    socket.to(roomId).emit('language-change', { language });
    // Save language to MongoDB
    Room.findOneAndUpdate({ roomId }, { language }).catch(err =>
      console.error('❌ Failed to save language:', err.message)
    );
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('🔴 User disconnected:', socket.id);
    roomUsers.forEach((users, roomId) => {
      users.forEach((userId) => {
        if (socket.id.includes(userId)) {
          users.delete(userId);
          io.to(roomId).emit('room-users', Array.from(users));
        }
      });
    });
  });
});

// ─── MongoDB + Server Start ───────────────────────────────────────────────────
mongoose.connect(MONGO_URL)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`🚀 Server running at PORT ${PORT} [${IS_PROD ? 'production' : 'development'}]`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal: string) => {
  console.log(`\n🚨 ${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await redis.quit();
      await mongoose.connection.close();
      console.log('✅ MongoDB & Redis connections closed.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  shutdown('unhandledRejection');
});