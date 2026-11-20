import { prisma } from '../lib/prisma.js';
import { logger } from '../config/logger.js';

export const expireAbandonedOrders = async () => {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

  const abandonedOrders = await prisma.order.findMany({
    where: {
      status: 'PENDING_PAYMENT',
      createdAt: { lt: cutoff },
    },
    include: {
      vendorOrders: { include: { items: true } },
    },
  });

  if (abandonedOrders.length === 0) return 0;

  logger.info({ count: abandonedOrders.length }, 'Expiring abandoned orders and restoring stock');

  let expiredCount = 0;
  for (const order of abandonedOrders) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
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
              note: 'Auto-cancelled due to payment timeout (30m expired). Stock restored.',
            },
          });

          // Restore stock
          for (const item of vo.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }
      });
      expiredCount++;
    } catch (err: any) {
      logger.error({ err: err.message, orderId: order.id }, 'Failed to expire order');
    }
  }

  return expiredCount;
};

export const startOrderExpiryJob = () => {
  // Run every 5 minutes
  setInterval(async () => {
    try {
      await expireAbandonedOrders();
    } catch (err: any) {
      logger.error({ err: err.message }, 'Error in order expiry periodic job');
    }
  }, 5 * 60 * 1000);
};

