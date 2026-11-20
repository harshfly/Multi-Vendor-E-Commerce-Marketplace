import { Request, Response, NextFunction } from 'express';
import { adminService } from './service.js';

export class AdminController {
  async getVendors(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const vendors = await adminService.getVendors(status);
      return res.json({ vendors });
    } catch (err) {
      next(err);
    }
  }

  async updateVendor(req: Request, res: Response, next: NextFunction) {
    try {
      const vendor = await adminService.updateVendor(req.params.id, req.body);
      return res.json({ vendor });
    } catch (err) {
      next(err);
    }
  }

  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const analytics = await adminService.getAnalytics();
      return res.json({ analytics });
    } catch (err) {
      next(err);
    }
  }

  async getAllOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await adminService.getAllOrders();
      return res.json({ orders });
    } catch (err) {
      next(err);
    }
  }

  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await adminService.getAllUsers();
      return res.json({ users });
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();

