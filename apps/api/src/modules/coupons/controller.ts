import { Request, Response, NextFunction } from 'express';
import { couponService } from './service.js';

export class CouponController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const coupons = await couponService.listCoupons(req.user!.userId, req.user!.role);
      return res.json({ coupons });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const coupon = await couponService.createCoupon(
        req.user!.userId,
        req.user!.role,
        req.body
      );
      return res.status(201).json({ coupon });
    } catch (err) {
      next(err);
    }
  }
}

export const couponController = new CouponController();

