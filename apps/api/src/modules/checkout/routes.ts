import { Router } from 'express';
import { checkoutController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { checkoutSchema } from '@haat/shared';

export const checkoutRouter = Router();

checkoutRouter.post('/', authenticate, validateBody(checkoutSchema), (req, res, next) =>
  checkoutController.checkout(req, res, next)
);

