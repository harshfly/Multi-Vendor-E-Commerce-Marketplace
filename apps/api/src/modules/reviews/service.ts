import { prisma } from '../../lib/prisma.js';
import { indexProduct } from '../../lib/es.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../middleware/error.js';
import { CreateReviewInput } from '@haat/shared';

export class ReviewService {
  async getProductReviews(productId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [total, reviews, allProductReviews] = await Promise.all([
      prisma.review.count({ where: { productId } }),
      prisma.review.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { user: { select: { id: true, name: true } } },
      }),
      prisma.review.findMany({
        where: { productId },
        select: { rating: true },
      }),
    ]);

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of allProductReviews) {
      if (r.rating in distribution) {
        (distribution as any)[r.rating]++;
      }
    }

    return {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      distribution,
    };
  }

  async createReview(userId: string, input: CreateReviewInput) {
    const product = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new NotFoundError('Product not found');

    // Verified purchase check: user must have a DELIVERED OrderItem for this product
    const deliveredItem = await prisma.orderItem.findFirst({
      where: {
        productId: input.productId,
        vendorOrder: {
          status: 'DELIVERED',
          order: { userId },
        },
      },
    });

    if (!deliveredItem) {
      throw new ForbiddenError(
        'You can only review products that have been delivered to you (Verified Purchase required).'
      );
    }

    const existing = await prisma.review.findUnique({
      where: {
        productId_userId: {
          productId: input.productId,
          userId,
        },
      },
    });

    if (existing) {
      throw new BadRequestError('You have already reviewed this product');
    }

    // Create review & recompute average in transaction
    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          productId: input.productId,
          userId,
          rating: input.rating,
          title: input.title,
          body: input.body,
          verifiedPurchase: true,
        },
      });

      const stats = await tx.review.aggregate({
        where: { productId: input.productId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.product.update({
        where: { id: input.productId },
        data: {
          ratingAvg: Math.round((stats._avg.rating || 0) * 10) / 10,
          ratingCount: stats._count.rating || 0,
        },
      });

      return created;
    });

    await indexProduct(input.productId);
    return review;
  }
}

export const reviewService = new ReviewService();

