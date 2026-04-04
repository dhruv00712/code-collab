// // src/routes/authRoutes.ts
// import express from 'express';
// import { register, login } from '../controllers/authController';

// const router = express.Router();

// router.post('/register', async (req, res) => {
//   await register(req, res);
// });

// router.post('/login', async (req, res) => {
//   await login(req, res);
// });

// export default router;

import express from 'express';
import { register, login } from '../controllers/authController';
import rateLimit from 'express-rate-limit';

// Strict rate limit for auth routes - prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 attempts per 15 min
  message: { message: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

export default router;