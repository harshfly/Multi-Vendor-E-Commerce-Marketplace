import { redis } from '../../lib/redis.js';
import { prisma } from '../../lib/prisma.js';
import { BadRequestError, NotFoundError } from '../../middleware/error.js';
import { calculateOrderFinancials, VendorSplitInput } from '@haat/shared';

const USER_CART_TTL = 30 * 24 * 60 * 60; // 30 days
const GUEST_CART_TTL = 7 * 24 * 60 * 60; // 7 days

export interface CartLine {
  productId: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    slug: string;
    pricePaise: number;
    mrpPaise: number | null;
    stock: number;
    inStock: boolean;
    imageUrl: string;
    vendor: {
      id: string;
      storeName: string;
      slug: string;
      commissionBps: number;
    };
  };
  itemTotalPaise: number;
}

export interface GroupedVendorCart {
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  lines: CartLine[];
  vendorSubtotalPaise: number;
}

export class CartService {
  private getCartKey(userId?: string, guestId?: string): string {
    if (userId) return `cart:${userId}`;
    if (guestId) return `cart:guest:${guestId}`;
    throw new BadRequestError('Either user ID or guest ID must be provided');
  }

  private getCouponKey(userId?: string, guestId?: string): string {
    if (userId) return `coupon:${userId}`;
    if (guestId) return `coupon:guest:${guestId}`;
    throw new BadRequestError('Either user ID or guest ID must be provided');
  }

  async getCart(userId?: string, guestId?: string) {
    const key = this.getCartKey(userId, guestId);
    const couponKey = this.getCouponKey(userId, guestId);

    const [rawItems, couponCode] = await Promise.all([
      redis.hgetall(key),
      redis.get(couponKey),
    ]);

    const productIds = Object.keys(rawItems);
    if (productIds.length === 0) {
      return {
        lines: [],
        vendors: [],
        subtotalPaise: 0,
        discountPaise: 0,
        shippingPaise: 0,
        totalPaise: 0,
        appliedCoupon: null,
        itemCount: 0,
      };
    }

    // Load active products from Postgres to attach LIVE prices & stock
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        vendor: { select: { id: true, storeName: true, slug: true, commissionBps: true } },
        images: { orderBy: { position: 'asc' }, take: 1 },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const lines: CartLine[] = [];
    const missingProductIds: string[] = [];

    for (const [pId, qtyStr] of Object.entries(rawItems)) {
      const quantity = parseInt(String(qtyStr), 10);
      const product = productMap.get(pId);

      if (!product || product.status !== 'ACTIVE') {
        missingProductIds.push(pId);
        continue;
      }

      lines.push({
        productId: pId,
        quantity,
        product: {
          id: product.id,
          title: product.title,
          slug: product.slug,
          pricePaise: product.pricePaise,
          mrpPaise: product.mrpPaise,
          stock: product.stock,
          inStock: product.stock >= quantity,
          imageUrl: product.images[0]?.url || '',
          vendor: {
            id: product.vendor.id,
            storeName: product.vendor.storeName,
            slug: product.vendor.slug,
            commissionBps: product.vendor.commissionBps,
          },
        },
        itemTotalPaise: product.pricePaise * quantity,
      });
    }

    // Clean up stale items from cart
    if (missingProductIds.length > 0) {
      await redis.hdel(key as string, ...missingProductIds);
    }

    // Group items by vendor
    const vendorMap = new Map<string, GroupedVendorCart>();
    for (const line of lines) {
      const vId = line.product.vendor.id;
      if (!vendorMap.has(vId)) {
        vendorMap.set(vId, {
          vendorId: vId,
          vendorName: line.product.vendor.storeName,
          vendorSlug: line.product.vendor.slug,
          lines: [],
          vendorSubtotalPaise: 0,
        });
      }
      const vendorGroup = vendorMap.get(vId)!;
      vendorGroup.lines.push(line);
      vendorGroup.vendorSubtotalPaise += line.itemTotalPaise;
    }

    const vendors = Array.from(vendorMap.values());
    const subtotalPaise = lines.reduce((sum, l) => sum + l.itemTotalPaise, 0);

    // Validate coupon if applied
    let discountPaise = 0;
    let appliedCoupon: any = null;

    if (couponCode && subtotalPaise > 0) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode },
        include: { redemptions: userId ? { where: { userId } } : undefined },
      });

      if (coupon && coupon.active && coupon.expiresAt > new Date() && coupon.startsAt <= new Date()) {
        const canUse =
          (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) &&
          (!userId || !coupon.redemptions || coupon.redemptions.length < coupon.perUserLimit) &&
          subtotalPaise >= coupon.minOrderPaise;

        if (canUse) {
          // If coupon is vendor scoped, apply only to that vendor's items
          let eligibleSubtotal = subtotalPaise;
          if (coupon.vendorId) {
            const vGroup = vendorMap.get(coupon.vendorId);
            eligibleSubtotal = vGroup ? vGroup.vendorSubtotalPaise : 0;
          }

          if (eligibleSubtotal > 0) {
            if (coupon.type === 'PERCENT') {
              const rawDiscount = Math.round((eligibleSubtotal * coupon.value) / 100);
              discountPaise = coupon.maxDiscountPaise
                ? Math.min(rawDiscount, coupon.maxDiscountPaise)
                : rawDiscount;
            } else {
              discountPaise = Math.min(coupon.value, eligibleSubtotal);
            }
            appliedCoupon = {
              code: coupon.code,
              type: coupon.type,
              value: coupon.value,
              discountPaise,
            };
          }
        }
      }
    }

    const shippingPaise = subtotalPaise > 0 ? (subtotalPaise >= 100000 ? 0 : 5000) : 0; // Free shipping over ₹1,000
    const totalPaise = Math.max(0, subtotalPaise - discountPaise + shippingPaise);

    return {
      lines,
      vendors,
      subtotalPaise,
      discountPaise,
      shippingPaise,
      totalPaise,
      appliedCoupon,
      itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
    };
  }

  async addItem(productId: string, quantity: number, userId?: string, guestId?: string) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'ACTIVE') {
      throw new NotFoundError('Product is not available');
    }
    if (product.stock < quantity) {
      throw new BadRequestError(`Only ${product.stock} units available in stock`);
    }

    const key = this.getCartKey(userId, guestId);
    const existingQtyStr = await redis.hget(key, productId);
    const newQty = (existingQtyStr ? parseInt(existingQtyStr, 10) : 0) + quantity;

    if (newQty > product.stock) {
      throw new BadRequestError(`Cannot add more than available stock (${product.stock})`);
    }

    await redis.hset(key, productId, newQty);
    await redis.expire(key, userId ? USER_CART_TTL : GUEST_CART_TTL);

    return this.getCart(userId, guestId);
  }

  async updateItem(productId: string, quantity: number, userId?: string, guestId?: string) {
    const key = this.getCartKey(userId, guestId);

    if (quantity <= 0) {
      await redis.hdel(key, productId);
    } else {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product || product.status !== 'ACTIVE') {
        throw new NotFoundError('Product not found');
      }
      if (quantity > product.stock) {
        throw new BadRequestError(`Only ${product.stock} units in stock`);
      }
      await redis.hset(key, productId, quantity);
      await redis.expire(key, userId ? USER_CART_TTL : GUEST_CART_TTL);
    }

    return this.getCart(userId, guestId);
  }

  async removeItem(productId: string, userId?: string, guestId?: string) {
    const key = this.getCartKey(userId, guestId);
    await redis.hdel(key, productId);
    return this.getCart(userId, guestId);
  }

  async applyCoupon(code: string, userId?: string, guestId?: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: { redemptions: userId ? { where: { userId } } : undefined },
    });

    if (!coupon || !coupon.active) {
      throw new BadRequestError('Invalid or inactive coupon code');
    }
    if (coupon.startsAt > new Date() || coupon.expiresAt < new Date()) {
      throw new BadRequestError('Coupon code has expired');
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestError('Coupon code usage limit reached');
    }
    if (userId && coupon.redemptions && coupon.redemptions.length >= coupon.perUserLimit) {
      throw new BadRequestError('You have already used this coupon');
    }

    const cart = await this.getCart(userId, guestId);
    if (cart.subtotalPaise < coupon.minOrderPaise) {
      const neededRupees = (coupon.minOrderPaise - cart.subtotalPaise) / 100;
      throw new BadRequestError(`This code requires ₹${neededRupees.toFixed(0)} more in your cart`);
    }

    const couponKey = this.getCouponKey(userId, guestId);
    await redis.set(couponKey, coupon.code, 'EX', userId ? USER_CART_TTL : GUEST_CART_TTL);

    return this.getCart(userId, guestId);
  }

  async removeCoupon(userId?: string, guestId?: string) {
    const couponKey = this.getCouponKey(userId, guestId);
    await redis.del(couponKey);
    return this.getCart(userId, guestId);
  }

  async mergeCart(guestId: string, userId: string) {
    const guestKey = this.getCartKey(undefined, guestId);
    const userKey = this.getCartKey(userId, undefined);

    const guestItems = await redis.hgetall(guestKey);
    if (Object.keys(guestItems).length > 0) {
      for (const [pId, qtyStr] of Object.entries(guestItems)) {
        const guestQty = parseInt(String(qtyStr), 10);
        const userQtyStr = await redis.hget(userKey, pId);
        const existingUserQty = userQtyStr ? parseInt(userQtyStr, 10) : 0;
        await redis.hset(userKey, pId, existingUserQty + guestQty);
      }
      await redis.expire(userKey, USER_CART_TTL);
      await redis.del(guestKey);
    }

    return this.getCart(userId, undefined);
  }

  async clearCart(userId: string) {
    const key = this.getCartKey(userId, undefined);
    const couponKey = this.getCouponKey(userId, undefined);
    await redis.del(key as string);
    await redis.del(couponKey as string);
  }
}

export const cartService = new CartService();
