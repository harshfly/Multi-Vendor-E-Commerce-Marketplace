import { Router } from 'express';
import { orderController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { updateFulfilmentStatusSchema } from '@haat/shared';

export const orderRouter = Router();

orderRouter.use(authenticate);

orderRouter.get('/', (req, res, next) => orderController.list(req, res, next));
orderRouter.get('/:id', (req, res, next) => orderController.getById(req, res, next));
orderRouter.post('/:id/cancel', (req, res, next) => orderController.cancel(req, res, next));
orderRouter.get('/:id/invoice', (req, res, next) => orderController.downloadInvoice(req, res, next));

// Vendor order fulfillment router
export const vendorOrderRouter = Router();
vendorOrderRouter.use(authenticate);
vendorOrderRouter.patch('/:id/status', validateBody(updateFulfilmentStatusSchema), (req, res, next) =>
  orderController.updateVendorOrderStatus(req, res, next)
);

