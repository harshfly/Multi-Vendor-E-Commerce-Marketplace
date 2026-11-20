import { Router } from 'express';
import { vendorController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { vendorApplySchema, vendorUpdateSchema, payoutAccountSchema, Role } from '@haat/shared';

export const vendorRouter = Router();

// Public storefront
vendorRouter.get('/:slug', (req, res, next) => vendorController.getBySlug(req, res, next));

// Vendor application (any authenticated user)
vendorRouter.post('/apply', authenticate, validateBody(vendorApplySchema), (req, res, next) =>
  vendorController.apply(req, res, next)
);

// Authenticated vendor routes
vendorRouter.get('/me/profile', authenticate, (req, res, next) => vendorController.getMe(req, res, next));
vendorRouter.patch('/me/profile', authenticate, validateBody(vendorUpdateSchema), (req, res, next) =>
  vendorController.updateMe(req, res, next)
);
vendorRouter.post('/me/payout-account', authenticate, validateBody(payoutAccountSchema), (req, res, next) =>
  vendorController.setPayoutAccount(req, res, next)
);
vendorRouter.get('/me/orders', authenticate, requireRole(Role.VENDOR, Role.ADMIN), (req, res, next) =>
  vendorController.getMyOrders(req, res, next)
);
vendorRouter.get('/me/analytics', authenticate, requireRole(Role.VENDOR, Role.ADMIN), (req, res, next) =>
  vendorController.getMyAnalytics(req, res, next)
);

