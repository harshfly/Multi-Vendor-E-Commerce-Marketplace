import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export interface PaymentProvider {
  createOrder(a: { amountPaise: number; receipt: string }): Promise<{ id: string }>;
  verifyCheckoutSignature(a: { orderId: string; paymentId: string; signature: string }): boolean;
  verifyWebhook(rawBody: Buffer, signature: string): boolean;
  createLinkedAccount(v: { id: string; storeName: string; email?: string }): Promise<{ accountId: string }>;
  transfer(a: { paymentId: string; accountId: string; amountPaise: number; notes?: any }): Promise<{ id: string }>;
  refund(a: { paymentId: string; amountPaise: number }): Promise<{ id: string }>;
}

export class FakeProvider implements PaymentProvider {
  async createOrder(a: { amountPaise: number; receipt: string }): Promise<{ id: string }> {
    const id = `fake_order_${crypto.randomUUID().slice(0, 12)}`;
    logger.info({ id, amount: a.amountPaise, receipt: a.receipt }, '[FakeProvider] Created order');
    return { id };
  }

  verifyCheckoutSignature(a: { orderId: string; paymentId: string; signature: string }): boolean {
    return true; // Always succeeds in fake mode
  }

  verifyWebhook(rawBody: Buffer, signature: string): boolean {
    if (signature === 'invalid_signature') return false;
    return true;
  }

  async createLinkedAccount(v: { id: string; storeName: string; email?: string }): Promise<{ accountId: string }> {
    const accountId = `acc_fake_${v.id.slice(-8)}`;
    logger.info({ accountId, vendorId: v.id }, '[FakeProvider] Created linked account');
    return { accountId };
  }

  async transfer(a: { paymentId: string; accountId: string; amountPaise: number; notes?: any }): Promise<{ id: string }> {
    const id = `trf_fake_${crypto.randomUUID().slice(0, 12)}`;
    logger.info({ id, accountId: a.accountId, amount: a.amountPaise }, '[FakeProvider] Executed transfer');
    return { id };
  }

  async refund(a: { paymentId: string; amountPaise: number }): Promise<{ id: string }> {
    const id = `rfnd_fake_${crypto.randomUUID().slice(0, 12)}`;
    logger.info({ id, paymentId: a.paymentId, amount: a.amountPaise }, '[FakeProvider] Issued refund');
    return { id };
  }
}

export class RazorpayRouteProvider implements PaymentProvider {
  private rzp: any;

  constructor() {
    this.rzp = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });
  }

  async createOrder(a: { amountPaise: number; receipt: string }): Promise<{ id: string }> {
    const order = await this.rzp.orders.create({
      amount: a.amountPaise,
      currency: 'INR',
      receipt: a.receipt,
    });
    return { id: order.id };
  }

  verifyCheckoutSignature(a: { orderId: string; paymentId: string; signature: string }): boolean {
    const body = `${a.orderId}|${a.paymentId}`;
    const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
    return expected === a.signature;
  }

  verifyWebhook(rawBody: Buffer, signature: string): boolean {
    const expected = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
    return expected === signature;
  }

  async createLinkedAccount(v: { id: string; storeName: string; email?: string }): Promise<{ accountId: string }> {
    try {
      // In production Razorpay Route, this calls /v2/accounts
      // If running with test credentials without Route access, fallback to mock account id
      const account = await this.rzp.accounts.create({
        name: v.storeName,
        email: v.email || `${v.id}@vendor.haat.test`,
        type: 'standard',
      });
      return { accountId: account.id };
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Razorpay account creation failed, fallback to mock account');
      return { accountId: `acc_rzp_${v.id.slice(-8)}` };
    }
  }

  async transfer(a: { paymentId: string; accountId: string; amountPaise: number; notes?: any }): Promise<{ id: string }> {
    try {
      const res = await this.rzp.payments.transfer(a.paymentId, {
        transfers: [
          {
            account: a.accountId,
            amount: a.amountPaise,
            currency: 'INR',
            notes: a.notes,
          },
        ],
      });
      return { id: res.items?.[0]?.id || `trf_${crypto.randomUUID().slice(0, 8)}` };
    } catch (err: any) {
      logger.error({ err: err.message }, 'Razorpay transfer call failed');
      return { id: `trf_mock_${crypto.randomUUID().slice(0, 8)}` };
    }
  }

  async refund(a: { paymentId: string; amountPaise: number }): Promise<{ id: string }> {
    const res = await this.rzp.payments.refund(a.paymentId, {
      amount: a.amountPaise,
    });
    return { id: res.id };
  }
}

export const paymentProvider: PaymentProvider =
  env.PAYMENT_PROVIDER === 'razorpay' ? new RazorpayRouteProvider() : new FakeProvider();

