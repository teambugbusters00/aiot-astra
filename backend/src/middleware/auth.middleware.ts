import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as JwtPayload;
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const optionalAuth = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const token = header.slice(7);
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as JwtPayload;
    } catch { /* ignore */ }
  }
  next();
};
