import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env.js';
import { Role } from '@haat/shared';

const makeToken = (userId: string, role: Role, vendorId?: string) => {
  return jwt.sign({ sub: userId, role, vendorId }, env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
};

describe('API Health & Basic Endpoints', () => {
  it('GET /health returns health info', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBeDefined();
    expect(res.body.services).toBeDefined();
  });
});

describe('RBAC Middleware Matrix', () => {
  it('blocks unauthenticated access to admin routes', async () => {
    const res = await request(app).get('/api/v1/admin/analytics');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('blocks customer from accessing admin routes', async () => {
    const customerToken = makeToken('user_cust_1', Role.CUSTOMER);
    const res = await request(app)
      .get('/api/v1/admin/analytics')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('blocks customer from vendor-only product creation', async () => {
    const customerToken = makeToken('user_cust_1', Role.CUSTOMER);
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        title: 'Test Product',
        description: 'Test description must be long enough',
        pricePaise: 10000,
        stock: 5,
        categoryId: 'cat_1',
        imageUrls: ['https://example.com/test.jpg'],
      });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('validates request payload with Zod schema and returns 400 for invalid inputs', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('Payment Webhook Idempotency & Signature', () => {
  it('rejects tampered webhook signature with 400', async () => {
    const res = await request(app)
      .post('/api/v1/webhooks/razorpay')
      .set('x-razorpay-signature', 'invalid_signature')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ event: 'payment.captured' }));
    expect(res.status).toBe(400);
  });
});

