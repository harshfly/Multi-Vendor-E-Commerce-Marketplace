import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Role } from '@haat/shared';

export interface AuthUser {
  userId: string;
  role: Role;
  vendorId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      sub: string;
      role: Role;
      vendorId?: string;
    };
    req.user = {
      userId: payload.sub,
      role: payload.role,
      vendorId: payload.vendorId,
    };
    next();
  } catch (err: any) {
    return res.status(401).json({
      error: { code: 'TOKEN_EXPIRED_OR_INVALID', message: 'Session expired or invalid token' },
    });
  }
};

export const optionalAuthenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
      sub: string;
      role: Role;
      vendorId?: string;
    };
    req.user = {
      userId: payload.sub,
      role: payload.role,
      vendorId: payload.vendorId,
    };
  } catch {
    // ignore
  }
  next();
};

