import { Request, Response, NextFunction } from 'express';
import { checkoutService } from './service.js';

export class CheckoutController {
  async checkout(req: Request, res: Response, next: NextFunction) {
    try {
      const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body.idempotencyKey;
      const result = await checkoutService.processCheckout(
        req.user!.userId,
        req.body,
        idempotencyKey
      );
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const checkoutController = new CheckoutController();

