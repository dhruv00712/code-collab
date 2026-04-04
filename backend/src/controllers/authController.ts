// import { Request, Response } from 'express';
// import bcrypt from 'bcryptjs';
// import jwt from 'jsonwebtoken';
// import { User } from '../models/User'; 

// const JWT_SECRET = process.env.JWT_SECRET as string;

// // REGISTER
// export const register = async (req: Request, res: Response) => {
//   console.log("📥 Register route hit", req.body); 
//   const { name, email, password } = req.body;

//   try {
//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: 'User already exists' });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const newUser = new User({
//       name,
//       email,
//       password: hashedPassword,
//     });

//     await newUser.save();

//     const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '7d' });

//     res.status(201).json({
//       user: {
//         _id: newUser._id,
//         name: newUser.name,
//         email: newUser.email,
//       },
//       token,
//     });
//   } catch (error: any) {
//     console.error('Register error:', error);
//     res.status(500).json({ message: 'Registration failed', error: error.message || error });
//   }
// };

// // LOGIN
// export const login = async (req: Request, res: Response) => {
//   const { email, password } = req.body;

//   try {
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }

//     const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

//     res.status(200).json({
//       user: {
//         _id: user._id,
//         name: user.name,
//         email: user.email,
//       },
//       token,
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ message: 'Login failed', error });
//   }
// };
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';


// if (!JWT_SECRET) {
//   throw new Error('JWT_SECRET is not defined in environment variables');
// }

// Helper to generate token
const generateToken = (userId: string): string => {
  const JWT_SECRET = process.env.JWT_SECRET as string;
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// REGISTER
export const register = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password } = req.body;

  // Input validation
  if (!name || !email || !password) {
    res.status(400).json({ message: 'Name, email and password are required' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ message: 'Password must be at least 6 characters' });
    return;
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12); // 12 rounds is stronger than 10

    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      provider: 'local',
    });

    await newUser.save();

    const token = generateToken((newUser._id as mongoose.Types.ObjectId).toString());

    res.status(201).json({
      message: 'Registration successful',
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        provider: newUser.provider,
      },
      token,
    });
  } catch (error: any) {
    console.error('❌ Register error:', error);
    // Handle duplicate key error from MongoDB
    if (error.code === 11000) {
      res.status(400).json({ message: 'Email already in use' });
      return;
    }
    res.status(500).json({ message: 'Registration failed' });
  }
};

// LOGIN
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'Email and password are required' });
    return;
  }

  try {
    // Explicitly select password since we set select: false in model
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      // Use same message for both cases to prevent email enumeration
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    if (!user.password) {
      res.status(401).json({ message: 'Please login with Google' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    const token = generateToken((user._id as mongoose.Types.ObjectId).toString());

    res.status(200).json({
      message: 'Login successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        provider: user.provider,
        avatar: user.avatar,
      },
      token,
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};