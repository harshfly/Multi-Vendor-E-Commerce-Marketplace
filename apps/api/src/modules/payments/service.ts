import { prisma } from '../../lib/prisma.js';
import { cartService } from '../cart/service.js';
import { paymentProvider } from '../../lib/razorpay.js';
import { logger } from '../../config/logger.js';
import { BadRequestError, NotFoundError } from '../../middleware/error.js';

export class PaymentService {
  async verifyClientSignature(orderId: string, paymentId: string, signature: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [{ orderId }, { providerOrderId: orderId }],
      },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundError('Payment record not found');
    }

    const isValid = paymentProvider.verifyCheckoutSignature({
      orderId: payment.providerOrderId,
      paymentId,
      signature,
    });

    if (!isValid) {
      throw new BadRequestError('Invalid payment signature');
    }

    // UX instant update
    await this.processPaymentSuccess(payment.providerOrderId, paymentId);

    return { success: true, orderId: payment.orderId };
  }

  async processPaymentSuccess(providerOrderId: string, providerPaymentId?: string) {
    const payment = await prisma.payment.findUnique({
      where: { providerOrderId },
      include: {
        order: {
          include: {
            vendorOrders: {
              include: { vendor: true, items: true },
            },
          },
        },
      },
    });

    if (!payment) {
      logger.warn({ providerOrderId }, 'Payment not found during capture processing');
      return;
    }

    if (payment.status === 'CAPTURED') {
      logger.info({ providerOrderId }, 'Payment already captured, skipping duplicate processing');
      return;
    }

    // 1. Transaction to mark Order as PAID & clear cart
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CAPTURED',
          providerPaymentId: providerPaymentId || `pay_${Date.now()}`,
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAID' },
      });

      for (const vo of payment.order.vendorOrders) {
        // Create initial PENDING payout record
        await tx.payout.upsert({
          where: { vendorOrderId: vo.id },
          update: {},
          create: {
            vendorOrderId: vo.id,
            amountPaise: vo.vendorPayoutPaise,
            status: 'PENDING',
          },
        });
      }
    });

    // 2. Clear customer's cart
    await cartService.clearCart(payment.order.userId);

    // 3. Initiate vendor payout transfers asynchronously
    for (const vo of payment.order.vendorOrders) {
      try {
        const transfer = await paymentProvider.transfer({
          paymentId: providerPaymentId || payment.providerPaymentId || payment.id,
          accountId: vo.vendor.gatewayAccountId || `acc_${vo.vendorId}`,
          amountPaise: vo.vendorPayoutPaise,
          notes: {
            vendorOrderId: vo.id,
            orderNumber: payment.order.number,
          },
        });

        await prisma.payout.update({
          where: { vendorOrderId: vo.id },
          data: {
            status: 'PROCESSED',
            providerTransferId: transfer.id,
          },
        });
        logger.info(
          { vendorOrderId: vo.id, amount: vo.vendorPayoutPaise, transferId: transfer.id },
          'Payout transfer processed successfully'
        );
      } catch (err: any) {
        logger.error(
          { err: err.message, vendorOrderId: vo.id },
          'Vendor transfer failed, marking payout as FAILED for retry'
        );
        await prisma.payout.update({
          where: { vendorOrderId: vo.id },
          data: { status: 'FAILED' },
        });
      }
    }
  }

  async processPaymentFailure(providerOrderId: string) {
    const payment = await prisma.payment.findUnique({
      where: { providerOrderId },
    });
    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      logger.info({ providerOrderId }, 'Payment marked as FAILED');
    }
  }
}

export const paymentService = new PaymentService();

