import { Router } from 'express';
import { cartController } from './controller.js';
import { optionalAuthenticate, authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { addToCartSchema, updateCartItemSchema, applyCouponSchema } from '@haat/shared';

export const cartRouter = Router();

cartRouter.use(optionalAuthenticate);

cartRouter.get('/', (req, res, next) => cartController.getCart(req, res, next));
cartRouter.post('/items', validateBody(addToCartSchema), (req, res, next) =>
  cartController.addItem(req, res, next)
);
cartRouter.patch('/items/:productId', validateBody(updateCartItemSchema), (req, res, next) =>
  cartController.updateItem(req, res, next)
);
cartRouter.delete('/items/:productId', (req, res, next) =>
  cartController.removeItem(req, res, next)
);
cartRouter.post('/coupon', validateBody(applyCouponSchema), (req, res, next) =>
  cartController.applyCoupon(req, res, next)
);
cartRouter.delete('/coupon', (req, res, next) =>
  cartController.removeCoupon(req, res, next)
);
cartRouter.post('/merge', authenticate, (req, res, next) =>
  cartController.mergeCart(req, res, next)
);

