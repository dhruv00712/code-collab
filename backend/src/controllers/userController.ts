import { Response } from 'express';
import { AuthenticatedRequest } from '../types/custom';

export const getProfile = (req: AuthenticatedRequest, res: Response): void => {
  const userId = req.user;
  if (!userId) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  // Send response
  res.status(200).json({ userId });
};
