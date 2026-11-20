import { Router } from 'express';
import { authController } from './controller.js';
import { validateBody } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';
import { registerSchema, loginSchema } from '@haat/shared';

export const authRouter = Router();

authRouter.use(authRateLimiter);

authRouter.post('/register', validateBody(registerSchema), (req, res, next) =>
  authController.register(req, res, next)
);

authRouter.post('/login', validateBody(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

authRouter.post('/refresh', (req, res, next) =>
  authController.refresh(req, res, next)
);

authRouter.post('/logout', (req, res, next) =>
  authController.logout(req, res, next)
);

authRouter.get('/me', authenticate, (req, res, next) =>
  authController.me(req, res, next)
);

