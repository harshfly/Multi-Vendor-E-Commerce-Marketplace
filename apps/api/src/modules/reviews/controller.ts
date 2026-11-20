import { Request, Response, NextFunction } from 'express';
import { reviewService } from './service.js';

export class ReviewController {
  async getProductReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const result = await reviewService.getProductReviews(req.params.id, page, limit);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async createReview(req: Request, res: Response, next: NextFunction) {
    try {
      const review = await reviewService.createReview(req.user!.userId, req.body);
      return res.status(201).json({ review });
    } catch (err) {
      next(err);
    }
  }
}

export const reviewController = new ReviewController();

