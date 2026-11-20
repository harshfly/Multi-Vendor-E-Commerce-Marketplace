import { prisma } from '../../lib/prisma.js';
import { BadRequestError, ForbiddenError } from '../../middleware/error.js';
import { CouponType } from '@haat/shared';

export interface CreateCouponPayload {
  code: string;
  type: CouponType;
  value: number;
  maxDiscountPaise?: number;
  minOrderPaise?: number;
  vendorId?: string;
  usageLimit?: number;
  perUserLimit?: number;
  startsAt: string;
  expiresAt: string;
}

export class CouponService {
  async listCoupons(userId: string, userRole: string) {
    if (userRole === 'ADMIN') {
      return prisma.coupon.findMany({
        orderBy: { startsAt: 'desc' },
        include: { vendor: { select: { storeName: true } } },
      });
    }

    const vendor = await prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new ForbiddenError('Not authorized');

    return prisma.coupon.findMany({
      where: { vendorId: vendor.id },
      orderBy: { startsAt: 'desc' },
    });
  }

  async createCoupon(userId: string, userRole: string, input: CreateCouponPayload) {
    let vendorId = input.vendorId;
    if (userRole === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId } });
      if (!vendor) throw new ForbiddenError('Not authorized');
      vendorId = vendor.id;
    }

    const existing = await prisma.coupon.findUnique({
      where: { code: input.code.toUpperCase() },
    });
    if (existing) {
      throw new BadRequestError('Coupon code already exists');
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: input.code.toUpperCase(),
        type: input.type,
        value: input.value,
        maxDiscountPaise: input.maxDiscountPaise,
        minOrderPaise: input.minOrderPaise || 0,
        vendorId: vendorId || null,
        usageLimit: input.usageLimit,
        perUserLimit: input.perUserLimit || 1,
        startsAt: new Date(input.startsAt),
        expiresAt: new Date(input.expiresAt),
        active: true,
      },
    });

    return coupon;
  }
}

export const couponService = new CouponService();

