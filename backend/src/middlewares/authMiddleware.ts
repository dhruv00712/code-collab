import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types/custom';

interface JwtPayload {
  userId: string;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Access token missing' });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
    if (err || !decoded) {
      res.status(403).json({ message: 'Invalid token' });
      return;
    }

    const payload = decoded as JwtPayload;
    req.user = payload.userId; // user will always be a string now
    next();
  });
};
