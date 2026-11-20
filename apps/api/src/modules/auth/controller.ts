import { Request, Response, NextFunction } from 'express';
import { authService } from './service.js';
import { env } from '../../config/env.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: (env.NODE_ENV === 'production' ? 'lax' : 'lax') as 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await authService.register(req.body);
      res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
      return res.status(201).json({ user, accessToken });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await authService.login(req.body);
      res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
      return res.json({ user, accessToken });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      const result = await authService.refresh(token);
      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
      return res.json({ user: result.user, accessToken: result.accessToken });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const token = req.cookies?.refreshToken;
      await authService.logout(token);
      res.clearCookie('refreshToken', COOKIE_OPTIONS);
      return res.json({ message: 'Logged out successfully' });
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.getMe(req.user!.userId);
      return res.json({ user });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();

