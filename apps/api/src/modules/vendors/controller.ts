import { Request, Response, NextFunction } from 'express';
import { vendorService } from './service.js';

export class VendorController {
  async apply(req: Request, res: Response, next: NextFunction) {
    try {
      const vendor = await vendorService.apply(req.user!.userId, req.body);
      return res.status(201).json({ vendor });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const vendor = await vendorService.getMe(req.user!.userId);
      return res.json({ vendor });
    } catch (err) {
      next(err);
    }
  }

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const vendor = await vendorService.updateMe(req.user!.userId, req.body);
      return res.json({ vendor });
    } catch (err) {
      next(err);
    }
  }

  async setPayoutAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await vendorService.setPayoutAccount(req.user!.userId, req.body);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const vendor = await vendorService.getBySlug(req.params.slug);
      return res.json({ vendor });
    } catch (err) {
      next(err);
    }
  }

  async getMyOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string;
      const orders = await vendorService.getMyOrders(req.user!.userId, status);
      return res.json({ orders });
    } catch (err) {
      next(err);
    }
  }

  async getMyAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const analytics = await vendorService.getMyAnalytics(req.user!.userId);
      return res.json({ analytics });
    } catch (err) {
      next(err);
    }
  }
}

export const vendorController = new VendorController();

