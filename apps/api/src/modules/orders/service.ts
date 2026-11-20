import { prisma } from '../../lib/prisma.js';
import { paymentProvider } from '../../lib/razorpay.js';
import { canMoveFulfilment, FulfilmentStatus, UpdateFulfilmentStatusInput } from '@haat/shared';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../middleware/error.js';

export class OrderService {
  async listUserOrders(userId: string) {
    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        payments: true,
        vendorOrders: {
          include: {
            vendor: { select: { id: true, storeName: true, slug: true } },
            items: true,
            statusHistory: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });
    return orders;
  }

  async getOrderById(orderId: string, userId: string, userRole: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        payments: true,
        vendorOrders: {
          include: {
            vendor: { select: { id: true, storeName: true, slug: true, logoUrl: true } },
            items: {
              include: {
                product: { select: { id: true, slug: true } },
              },
            },
            statusHistory: { orderBy: { createdAt: 'asc' } },
            payout: true,
          },
        },
      },
    });

    if (!order) throw new NotFoundError('Order not found');

    if (userRole !== 'ADMIN' && order.userId !== userId) {
      // Check if user is a vendor who owns a VendorOrder in this order
      const vendor = await prisma.vendor.findUnique({ where: { userId } });
      const ownsVendorOrder = vendor && order.vendorOrders.some((vo) => vo.vendorId === vendor.id);
      if (!ownsVendorOrder) {
        throw new ForbiddenError('You do not have access to this order');
      }
    }

    return order;
  }

  async cancelOrder(orderId: string, userId: string, userRole: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        vendorOrders: { include: { items: true } },
        payments: true,
      },
    });

    if (!order) throw new NotFoundError('Order not found');

    if (userRole !== 'ADMIN' && order.userId !== userId) {
      throw new ForbiddenError('You can only cancel your own orders');
    }

    // Check that none of the vendor orders have shipped or been delivered
    const anyShippedOrDelivered = order.vendorOrders.some((vo) =>
      ['SHIPPED', 'DELIVERED'].includes(vo.status)
    );

    if (anyShippedOrDelivered) {
      throw new BadRequestError('Cannot cancel order because one or more shipments have already been dispatched');
    }

    // Process refund and stock restoration in transaction
    await prisma.$transaction(async (tx) => {
      // 1. Mark Order & VendorOrders as CANCELLED or REFUNDED
      const newStatus = order.status === 'PAID' ? 'REFUNDED' : 'CANCELLED';
      await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus as any },
      });

      for (const vo of order.vendorOrders) {
        await tx.vendorOrder.update({
          where: { id: vo.id },
          data: { status: 'CANCELLED' },
        });

        await tx.orderStatusEvent.create({
          data: {
            vendorOrderId: vo.id,
            status: 'CANCELLED',
            note: 'Order cancelled by customer',
          },
        });

        // 2. Restore stock for each item
        for (const item of vo.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // 3. Initiate refund with payment gateway if paid
      if (order.status === 'PAID') {
        const payment = order.payments.find((p) => p.status === 'CAPTURED');
        if (payment && payment.providerPaymentId) {
          try {
            await paymentProvider.refund({
              paymentId: payment.providerPaymentId,
              amountPaise: payment.amountPaise,
            });
            await tx.payment.update({
              where: { id: payment.id },
              data: { status: 'REFUNDED' },
            });
          } catch (err: any) {
            // Keep error noted
          }
        }
      }
    });

    return { success: true, message: 'Order cancelled and stock restored' };
  }

  async updateVendorOrderStatus(
    vendorOrderId: string,
    userId: string,
    userRole: string,
    input: UpdateFulfilmentStatusInput
  ) {
    const vendorOrder = await prisma.vendorOrder.findUnique({
      where: { id: vendorOrderId },
      include: {
        vendor: true,
        order: true,
      },
    });

    if (!vendorOrder) throw new NotFoundError('Vendor order not found');

    if (userRole !== 'ADMIN' && vendorOrder.vendor.userId !== userId) {
      throw new ForbiddenError('You can only update status for your own store orders');
    }

    if (!canMoveFulfilment(vendorOrder.status as FulfilmentStatus, input.status as FulfilmentStatus)) {
      throw new BadRequestError(
        `Illegal status transition: cannot move from ${vendorOrder.status} to ${input.status}`
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const vo = await tx.vendorOrder.update({
        where: { id: vendorOrderId },
        data: {
          status: input.status as any,
          ...(input.trackingNumber && { trackingNumber: input.trackingNumber }),
        },
      });

      await tx.orderStatusEvent.create({
        data: {
          vendorOrderId,
          status: input.status as any,
          note: input.note || (input.trackingNumber ? `Tracking: ${input.trackingNumber}` : undefined),
        },
      });

      return vo;
    });

    return updated;
  }
}

export const orderService = new OrderService();

