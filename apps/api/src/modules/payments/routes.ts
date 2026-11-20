import { Router } from 'express';
import { paymentController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';

export const paymentRouter = Router();

paymentRouter.post('/verify', authenticate, (req, res, next) =>
  paymentController.verify(req, res, next)
);

