import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { checkDatabaseHealth } from './lib/prisma.js';
import { checkRedisHealth } from './lib/redis.js';
import { errorHandler } from './middleware/error.js';
import { generalRateLimiter } from './middleware/rateLimit.js';

// Import modules
import { authRouter } from './modules/auth/routes.js';
import { vendorRouter } from './modules/vendors/routes.js';
import { productRouter } from './modules/products/routes.js';
import { searchRouter } from './modules/search/routes.js';
import { cartRouter } from './modules/cart/routes.js';
import { checkoutRouter } from './modules/checkout/routes.js';
import { orderRouter, vendorOrderRouter } from './modules/orders/routes.js';
import { paymentRouter } from './modules/payments/routes.js';
import { paymentController } from './modules/payments/controller.js';
import { reviewRouter } from './modules/reviews/routes.js';
import { couponRouter } from './modules/coupons/routes.js';
import { adminRouter } from './modules/admin/routes.js';

export const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // In dev or test, allow web origin or localhost
      if (!origin || origin.startsWith('http://localhost') || origin === env.WEB_ORIGIN) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

// Mount Webhook raw body endpoint BEFORE express.json()
app.post(
  '/api/v1/webhooks/razorpay',
  express.raw({ type: 'application/json' }),
  (req, res) => paymentController.handleWebhook(req, res)
);

// Standard parsers
app.use(express.json());
app.use(cookieParser());
app.use(generalRateLimiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  const [dbOk, redisOk] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
  ]);

  const healthy = dbOk;
  const status = healthy ? 200 : 503;

  return res.status(status).json({
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'up' : 'down',
      redis: redisOk ? 'up' : 'memory-fallback',
      search: env.SEARCH_DRIVER,
      paymentProvider: env.PAYMENT_PROVIDER,
    },
  });
});

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/vendors', vendorRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/checkout', checkoutRouter);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/vendor-orders', vendorOrderRouter);
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/coupons', couponRouter);
app.use('/api/v1/admin', adminRouter);

// Global Error Handler
app.use(errorHandler);

