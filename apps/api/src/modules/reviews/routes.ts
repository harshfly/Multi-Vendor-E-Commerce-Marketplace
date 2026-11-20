import { Router } from 'express';
import { reviewController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { createReviewSchema } from '@haat/shared';

export const reviewRouter = Router();

reviewRouter.get('/:id/reviews', (req, res, next) => reviewController.getProductReviews(req, res, next));
reviewRouter.post('/', authenticate, validateBody(createReviewSchema), (req, res, next) =>
  reviewController.createReview(req, res, next)
);

