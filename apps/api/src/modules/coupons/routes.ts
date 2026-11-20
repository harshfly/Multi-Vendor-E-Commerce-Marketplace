import { Router } from 'express';
import { couponController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { Role } from '@haat/shared';

export const couponRouter = Router();

couponRouter.use(authenticate, requireRole(Role.VENDOR, Role.ADMIN));

couponRouter.get('/', (req, res, next) => couponController.list(req, res, next));
couponRouter.post('/', (req, res, next) => couponController.create(req, res, next));

