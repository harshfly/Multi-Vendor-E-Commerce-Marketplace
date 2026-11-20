import { Request, Response, NextFunction } from 'express';
import { cartService } from './service.js';

export class CartController {
  private getIdentifiers(req: Request) {
    const userId = req.user?.userId;
    const guestId = req.headers['x-guest-id'] as string | undefined;
    return { userId, guestId: !userId ? guestId || 'guest_default' : undefined };
  }

  async getCart(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, guestId } = this.getIdentifiers(req);
      const cart = await cartService.getCart(userId, guestId);
      return res.json({ cart });
    } catch (err) {
      next(err);
    }
  }

  async addItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, guestId } = this.getIdentifiers(req);
      const { productId, quantity = 1 } = req.body;
      const cart = await cartService.addItem(productId, quantity, userId, guestId);
      return res.json({ cart });
    } catch (err) {
      next(err);
    }
  }

  async updateItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, guestId } = this.getIdentifiers(req);
      const { productId } = req.params;
      const { quantity } = req.body;
      const cart = await cartService.updateItem(productId, quantity, userId, guestId);
      return res.json({ cart });
    } catch (err) {
      next(err);
    }
  }

  async removeItem(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, guestId } = this.getIdentifiers(req);
      const { productId } = req.params;
      const cart = await cartService.removeItem(productId, userId, guestId);
      return res.json({ cart });
    } catch (err) {
      next(err);
    }
  }

  async applyCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, guestId } = this.getIdentifiers(req);
      const { code } = req.body;
      const cart = await cartService.applyCoupon(code, userId, guestId);
      return res.json({ cart });
    } catch (err) {
      next(err);
    }
  }

  async removeCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId, guestId } = this.getIdentifiers(req);
      const cart = await cartService.removeCoupon(userId, guestId);
      return res.json({ cart });
    } catch (err) {
      next(err);
    }
  }

  async mergeCart(req: Request, res: Response, next: NextFunction) {
    try {
      const guestId = req.body.guestId || (req.headers['x-guest-id'] as string);
      const userId = req.user!.userId;
      const cart = await cartService.mergeCart(guestId, userId);
      return res.json({ cart });
    } catch (err) {
      next(err);
    }
  }
}

export const cartController = new CartController();

