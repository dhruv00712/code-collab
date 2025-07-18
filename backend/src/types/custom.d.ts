// types/custom.d.ts
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: string | number | object; 
}
