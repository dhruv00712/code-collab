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




// import express from 'express';
// import { register, login } from '../controllers/authController';
// import rateLimit from 'express-rate-limit';

// // Strict rate limit for auth routes - prevent brute force
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 10, // max 10 attempts per 15 min
//   message: { message: 'Too many attempts, please try again after 15 minutes' },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// const router = express.Router();

// router.post('/register', authLimiter, register);
// router.post('/login', authLimiter, login);

// export default router;

import express from 'express';
import { register, login } from '../controllers/authController';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Google login - create/find user and return JWT
router.post('/google', async (req, res) => {
  const { email, name, image } = req.body;

  if (!email) {
    res.status(400).json({ message: 'Email required' });
    return;
  }

  try {
    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name,
        email,
        provider: 'google',
        avatar: image,
      });
      await user.save();
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      }
    });
  } catch (error) {
    console.error('❌ Google auth error:', error);
    res.status(500).json({ message: 'Google auth failed' });
  }
});

export default router;