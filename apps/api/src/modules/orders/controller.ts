import { Request, Response, NextFunction } from 'express';
import { orderService } from './service.js';
import { invoiceService } from '../invoices/service.js';

export class OrderController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const orders = await orderService.listUserOrders(req.user!.userId);
      return res.json({ orders });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await orderService.getOrderById(
        req.params.id,
        req.user!.userId,
        req.user!.role
      );
      return res.json({ order });
    } catch (err) {
      next(err);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await orderService.cancelOrder(
        req.params.id,
        req.user!.userId,
        req.user!.role
      );
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async downloadInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const pdfDoc = await invoiceService.generateOrderInvoicePdf(
        req.params.id,
        req.user!.userId,
        req.user!.role
      );
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Invoice-${req.params.id}.pdf"`);
      pdfDoc.pipe(res);
    } catch (err) {
      next(err);
    }
  }

  async updateVendorOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const updated = await orderService.updateVendorOrderStatus(
        req.params.id,
        req.user!.userId,
        req.user!.role,
        req.body
      );
      return res.json({ vendorOrder: updated });
    } catch (err) {
      next(err);
    }
  }
}

export const orderController = new OrderController();

