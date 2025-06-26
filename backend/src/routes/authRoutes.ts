// src/routes/authRoutes.ts
import express from 'express';
import { register, login } from '../controllers/authController';

const router = express.Router();

// Route to register a new user
router.post('/register', async (req, res) => {
  await register(req, res);
});

// Route to log in an existing user
router.post('/login', async (req, res) => {
  await login(req, res);
});

export default router;
