import { prisma } from '../../lib/prisma.js';
import { paymentProvider } from '../../lib/razorpay.js';
import { BadRequestError, NotFoundError, ForbiddenError } from '../../middleware/error.js';
import { VendorApplyInput, VendorUpdateInput, PayoutAccountInput } from '@haat/shared';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class VendorService {
  async apply(userId: string, input: VendorApplyInput) {
    const existing = await prisma.vendor.findUnique({
      where: { userId },
    });
    if (existing) {
      throw new BadRequestError('You have already applied for or have a vendor account');
    }

    let baseSlug = slugify(input.storeName);
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.vendor.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const vendor = await prisma.vendor.create({
      data: {
        userId,
        storeName: input.storeName,
        slug,
        description: input.description,
        logoUrl: input.logoUrl,
        status: 'PENDING',
      },
    });

    return vendor;
  }

  async getMe(userId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { userId },
      include: {
        _count: {
          select: { products: true, vendorOrders: true },
        },
      },
    });
    if (!vendor) {
      throw new NotFoundError('Vendor profile not found');
    }
    return vendor;
  }

  async updateMe(userId: string, input: VendorUpdateInput) {
    const vendor = await prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new NotFoundError('Vendor profile not found');

    const updated = await prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        ...(input.storeName && { storeName: input.storeName }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      },
    });
    return updated;
  }

  async setPayoutAccount(userId: string, input: PayoutAccountInput) {
    const vendor = await prisma.vendor.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (!vendor) throw new NotFoundError('Vendor profile not found');

    const { accountId } = await paymentProvider.createLinkedAccount({
      id: vendor.id,
      storeName: vendor.storeName,
      email: vendor.user.email,
    });

    const updated = await prisma.vendor.update({
      where: { id: vendor.id },
      data: { gatewayAccountId: accountId },
    });

    return { success: true, gatewayAccountId: accountId };
  }

  async getBySlug(slug: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { slug },
      include: {
        products: {
          where: { status: 'ACTIVE' },
          include: {
            images: { orderBy: { position: 'asc' }, take: 1 },
            category: true,
          },
        },
      },
    });
    if (!vendor || vendor.status !== 'APPROVED') {
      throw new NotFoundError('Vendor storefront not found');
    }
    return vendor;
  }

  async getMyOrders(userId: string, status?: any) {
    const vendor = await prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new ForbiddenError('Not a registered vendor');

    const where: any = { vendorId: vendor.id };
    if (status) {
      where.status = status;
    }

    const orders = await prisma.vendorOrder.findMany({
      where,
      orderBy: { order: { createdAt: 'desc' } },
      include: {
        order: {
          select: {
            number: true,
            createdAt: true,
            shippingAddress: true,
            user: { select: { name: true, email: true } },
          },
        },
        items: true,
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    return orders;
  }

  async getMyAnalytics(userId: string) {
    const vendor = await prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new ForbiddenError('Not a registered vendor');

    const vendorOrders = await prisma.vendorOrder.findMany({
      where: {
        vendorId: vendor.id,
        order: { status: 'PAID' },
      },
      include: { items: true, order: true },
    });

    const totalRevenuePaise = vendorOrders.reduce((sum, o) => sum + o.subtotalPaise - o.discountPaise, 0);
    const totalPayoutPaise = vendorOrders.reduce((sum, o) => sum + o.vendorPayoutPaise, 0);
    const totalCommissionPaise = vendorOrders.reduce((sum, o) => sum + o.commissionPaise, 0);
    const totalOrders = vendorOrders.length;

    // Top products
    const productStats = new Map<string, { title: string; count: number; revenuePaise: number }>();
    for (const order of vendorOrders) {
      for (const item of order.items) {
        const cur = productStats.get(item.productId) || {
          title: item.titleSnapshot,
          count: 0,
          revenuePaise: 0,
        };
        cur.count += item.quantity;
        cur.revenuePaise += item.unitPricePaise * item.quantity;
        productStats.set(item.productId, cur);
      }
    }

    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.revenuePaise - a.revenuePaise)
      .slice(0, 5);

    return {
      totalRevenuePaise,
      totalPayoutPaise,
      totalCommissionPaise,
      totalOrders,
      topProducts,
    };
  }
}

export const vendorService = new VendorService();

