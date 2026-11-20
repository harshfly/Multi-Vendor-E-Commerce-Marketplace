import { Request, Response, NextFunction } from 'express';
import { paymentService } from './service.js';
import { paymentProvider } from '../../lib/razorpay.js';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../config/logger.js';

export class PaymentController {
  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
      const targetOrderId = razorpay_order_id || orderId;

      const result = await paymentService.verifyClientSignature(
        targetOrderId,
        razorpay_payment_id || `sim_pay_${Date.now()}`,
        razorpay_signature || 'sim_sig'
      );

      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async handleWebhook(req: Request, res: Response) {
    const signature = req.header('x-razorpay-signature') || '';
    const rawBody = req.body as Buffer;

    if (!paymentProvider.verifyWebhook(rawBody, signature)) {
      logger.warn('Invalid Razorpay webhook signature');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    let event: any;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Malformed payload' });
    }

    const eventId = req.header('x-razorpay-event-id') || event.id || `evt_${Date.now()}`;

    // Idempotency check via WebhookEvent table
    try {
      await prisma.webhookEvent.create({
        data: {
          id: eventId,
          type: event.event || 'payment.captured',
        },
      });
    } catch {
      // Already processed -> idempotent return
      return res.status(200).json({ message: 'Event already processed' });
    }

    try {
      if (event.event === 'payment.captured' || event.event === 'order.paid') {
        const orderId = event.payload?.payment?.entity?.order_id || event.payload?.order?.entity?.id;
        const paymentId = event.payload?.payment?.entity?.id;
        if (orderId) {
          await paymentService.processPaymentSuccess(orderId, paymentId);
        }
      } else if (event.event === 'payment.failed') {
        const orderId = event.payload?.payment?.entity?.order_id;
        if (orderId) {
          await paymentService.processPaymentFailure(orderId);
        }
      }
    } catch (err: any) {
      logger.error({ err: err.message, eventId }, 'Error processing webhook event');
    }

    return res.status(200).json({ status: 'ok' });
  }
}

export const paymentController = new PaymentController();

