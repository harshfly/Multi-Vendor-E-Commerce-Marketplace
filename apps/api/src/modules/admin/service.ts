import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { NotFoundError } from '../../middleware/error.js';
import { AdminUpdateVendorInput } from '@haat/shared';

export class AdminService {
  async getVendors(status?: any) {
    const where: any = {};
    if (status) where.status = status;

    return prisma.vendor.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { products: true, vendorOrders: true } },
      },
    });
  }

  async updateVendor(vendorId: string, input: AdminUpdateVendorInput) {
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundError('Vendor not found');

    const updated = await prisma.$transaction(async (tx) => {
      const v = await tx.vendor.update({
        where: { id: vendorId },
        data: {
          ...(input.status && { status: input.status }),
          ...(input.commissionBps !== undefined && { commissionBps: input.commissionBps }),
        },
      });

      // If approved, update user role to VENDOR
      if (input.status === 'APPROVED') {
        await tx.user.update({
          where: { id: vendor.userId },
          data: { role: 'VENDOR' },
        });
      }

      return v;
    });

    return updated;
  }

  async getAnalytics() {
    const cached = await redis.get('admin:analytics');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }

    const [paidOrders, vendorOrders, vendorsCount, activeProductsCount, totalUsers] =
      await Promise.all([
        prisma.order.findMany({
          where: { status: 'PAID' },
          select: {
            id: true,
            totalPaise: true,
            createdAt: true,
          },
        }),
        prisma.vendorOrder.findMany({
          where: { order: { status: 'PAID' } },
          include: {
            vendor: { select: { storeName: true } },
            order: { select: { createdAt: true } },
          },
        }),
        prisma.vendor.count({ where: { status: 'APPROVED' } }),
        prisma.product.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count(),
      ]);

    const gmvPaise = paidOrders.reduce((sum, o) => sum + o.totalPaise, 0);
    const commissionEarnedPaise = vendorOrders.reduce((sum, vo) => sum + vo.commissionPaise, 0);
    const totalOrders = paidOrders.length;

    // Daily revenue & commission (past 30 days)
    const dailyMap = new Map<string, { date: string; revenuePaise: number; commissionPaise: number; orders: number }>();
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dailyMap.set(key, { date: key, revenuePaise: 0, commissionPaise: 0, orders: 0 });
    }

    for (const vo of vendorOrders) {
      const key = vo.order.createdAt.toISOString().split('T')[0];
      const cur = dailyMap.get(key);
      if (cur) {
        cur.revenuePaise += vo.subtotalPaise - vo.discountPaise;
        cur.commissionPaise += vo.commissionPaise;
        cur.orders += 1;
      }
    }

    const revenueByDay = Array.from(dailyMap.values());

    // Top vendors by GMV
    const vendorSalesMap = new Map<string, { storeName: string; salesPaise: number; commissionPaise: number }>();
    for (const vo of vendorOrders) {
      const cur = vendorSalesMap.get(vo.vendorId) || {
        storeName: vo.vendor.storeName,
        salesPaise: 0,
        commissionPaise: 0,
      };
      cur.salesPaise += vo.subtotalPaise - vo.discountPaise;
      cur.commissionPaise += vo.commissionPaise;
      vendorSalesMap.set(vo.vendorId, cur);
    }

    const topVendors = Array.from(vendorSalesMap.values())
      .sort((a, b) => b.salesPaise - a.salesPaise)
      .slice(0, 8);

    const result = {
      gmvPaise,
      commissionEarnedPaise,
      totalOrders,
      activeVendors: vendorsCount,
      activeProducts: activeProductsCount,
      totalUsers,
      revenueByDay,
      topVendors,
    };

    await redis.set('admin:analytics', JSON.stringify(result), 'EX', 60);
    return result;
  }

  async getAllOrders() {
    return prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { name: true, email: true } },
        vendorOrders: {
          include: { vendor: { select: { storeName: true } } },
        },
        payments: true,
      },
    });
  }

  async getAllUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        vendor: { select: { storeName: true, status: true } },
      },
    });
  }
}

export const adminService = new AdminService();
