import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: string | number | object; // type your user as needed
    }
  }
}

export {};
