import crypto from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { cartService } from '../cart/service.js';
import { paymentProvider } from '../../lib/razorpay.js';
import { env } from '../../config/env.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../middleware/error.js';
import { calculateOrderFinancials, VendorSplitInput, CheckoutInput } from '@haat/shared';

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `HAAT-${year}-${rand}`;
}

export class CheckoutService {
  async processCheckout(userId: string, input: CheckoutInput, idempotencyKey?: string) {
    // 0. Idempotency check: if order with this key exists, return it
    if (idempotencyKey) {
      const existingOrder = await prisma.order.findUnique({
        where: { idempotencyKey },
        include: { payments: true, vendorOrders: { include: { items: true } } },
      });
      if (existingOrder) {
        const payment = existingOrder.payments[0];
        return {
          orderId: existingOrder.id,
          orderNumber: existingOrder.number,
          gatewayOrderId: payment?.providerOrderId || '',
          amountPaise: existingOrder.totalPaise,
          currency: 'INR',
          keyId: env.RAZORPAY_KEY_ID,
        };
      }
    }

    // 1. Get live enriched cart
    const cart = await cartService.getCart(userId);
    if (cart.lines.length === 0) {
      throw new BadRequestError('Your cart is empty');
    }

    // Check address
    let shippingAddressJson: any = input.shippingAddress;
    if (!shippingAddressJson && input.addressId) {
      const address = await prisma.address.findFirst({
        where: { id: input.addressId, userId },
      });
      if (!address) throw new NotFoundError('Selected address not found');
      shippingAddressJson = {
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
      };
    }

    if (!shippingAddressJson) {
      // Create a default shipping address snapshot if none provided
      const user = await prisma.user.findUnique({ where: { id: userId } });
      shippingAddressJson = {
        fullName: user?.name || 'Customer',
        phone: '9876543210',
        line1: '123 Market Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      };
    }

    const orderNumber = generateOrderNumber();

    // 2. Transaction: Stock decrement, Order & VendorOrders creation, Gateway order creation
    const result = await prisma.$transaction(async (tx) => {
      // Step A: Atomically lock and decrement stock for every line
      for (const line of cart.lines) {
        const updateResult = await tx.product.updateMany({
          where: {
            id: line.productId,
            status: 'ACTIVE',
            stock: { gte: line.quantity },
          },
          data: {
            stock: { decrement: line.quantity },
          },
        });

        if (updateResult.count === 0) {
          throw new ConflictError(`"${line.product.title}" is out of stock or insufficient quantity.`);
        }
      }

      // Step B: Calculate financials and vendor splits
      const vendorInputs: VendorSplitInput[] = cart.vendors.map((v) => ({
        vendorId: v.vendorId,
        subtotalPaise: v.vendorSubtotalPaise,
        commissionBps: v.lines[0]?.product.vendor.commissionBps ?? env.DEFAULT_COMMISSION_BPS,
      }));

      const financials = calculateOrderFinancials(
        vendorInputs,
        cart.discountPaise,
        cart.shippingPaise
      );

      // Invariant check: sum(vendorOrders) === order.total
      const sumVendorSubtotals = financials.vendorSplits.reduce(
        (sum, v) => sum + (v.subtotalPaise - v.discountPaise),
        0
      );
      if (sumVendorSubtotals + financials.shippingPaise !== financials.totalPaise) {
        throw new Error('Internal accounting invariant failure in cart splits');
      }

      // Step C: Create Order
      const order = await tx.order.create({
        data: {
          number: orderNumber,
          userId,
          status: 'PENDING_PAYMENT',
          subtotalPaise: financials.subtotalPaise,
          discountPaise: financials.discountPaise,
          shippingPaise: financials.shippingPaise,
          totalPaise: financials.totalPaise,
          couponCode: cart.appliedCoupon?.code || null,
          shippingAddress: shippingAddressJson,
          idempotencyKey: idempotencyKey || null,
        },
      });

      // Step D: Create VendorOrders, Items, and Initial Status Events
      for (const split of financials.vendorSplits) {
        const vendorGroup = cart.vendors.find((v) => v.vendorId === split.vendorId)!;

        const vendorOrder = await tx.vendorOrder.create({
          data: {
            orderId: order.id,
            vendorId: split.vendorId,
            status: 'PLACED',
            subtotalPaise: split.subtotalPaise,
            discountPaise: split.discountPaise,
            commissionPaise: split.commissionPaise,
            vendorPayoutPaise: split.payoutPaise,
            statusHistory: {
              create: {
                status: 'PLACED',
                note: 'Order placed by customer',
              },
            },
            items: {
              create: vendorGroup.lines.map((l) => ({
                productId: l.productId,
                titleSnapshot: l.product.title,
                imageSnapshot: l.product.imageUrl,
                unitPricePaise: l.product.pricePaise,
                quantity: l.quantity,
              })),
            },
          },
        });
      }

      // Step E: Record coupon redemption if coupon used
      if (cart.appliedCoupon?.code) {
        const coupon = await tx.coupon.findUnique({ where: { code: cart.appliedCoupon.code } });
        if (coupon) {
          await tx.couponRedemption.create({
            data: {
              couponId: coupon.id,
              userId,
              orderId: order.id,
            },
          });
          await tx.coupon.update({
            where: { id: coupon.id },
            data: { usedCount: { increment: 1 } },
          });
        }
      }

      // Step F: Create payment with provider
      const gatewayOrder = await paymentProvider.createOrder({
        amountPaise: order.totalPaise,
        receipt: order.number,
      });

      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          provider: env.PAYMENT_PROVIDER,
          providerOrderId: gatewayOrder.id,
          amountPaise: order.totalPaise,
          status: 'CREATED',
        },
      });

      return {
        order,
        gatewayOrderId: gatewayOrder.id,
      };
    });

    return {
      orderId: result.order.id,
      orderNumber: result.order.number,
      gatewayOrderId: result.gatewayOrderId,
      amountPaise: result.order.totalPaise,
      currency: 'INR',
      keyId: env.RAZORPAY_KEY_ID,
    };
  }
}

export const checkoutService = new CheckoutService();

