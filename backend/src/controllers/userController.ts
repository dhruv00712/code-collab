// import { Response } from 'express';
// import { AuthenticatedRequest } from '../types/custom';

// export const getProfile = (req: AuthenticatedRequest, res: Response): void => {
//   const userId = req.user;
//   if (!userId) {
//     res.status(401).json({ message: 'Unauthorized' });
//     return;
//   }

//   // Send response
//   res.status(200).json({ userId });
// };

import { Response } from 'express';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../types/custom';

export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user;

  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};