import { Router } from 'express';
import { adminController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { adminUpdateVendorSchema, Role } from '@haat/shared';

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole(Role.ADMIN));

adminRouter.get('/vendors', (req, res, next) => adminController.getVendors(req, res, next));
adminRouter.patch('/vendors/:id', validateBody(adminUpdateVendorSchema), (req, res, next) =>
  adminController.updateVendor(req, res, next)
);
adminRouter.get('/analytics', (req, res, next) => adminController.getAnalytics(req, res, next));
adminRouter.get('/orders', (req, res, next) => adminController.getAllOrders(req, res, next));
adminRouter.get('/users', (req, res, next) => adminController.getAllUsers(req, res, next));

