// src/controllers/authController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {User} from '../models/User'; 

// Fetch the JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET as string;

// REGISTER
export const register = async (req: Request, res: Response) => {
     console.log("📥 Register route hit", req.body); 
  const { name, email, password } = req.body;

  try {
  
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();


const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    res.status(201).json({ user: newUser, token });
  } catch (error: any) {
  console.error('Register error:', error);
  res.status(500).json({ message: 'Registration failed', error: error.message || error });
}

};

// LOGIN
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate a JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

    // Send the response with user info and token
    res.status(200).json({ user, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Login failed', error });
  }
};
