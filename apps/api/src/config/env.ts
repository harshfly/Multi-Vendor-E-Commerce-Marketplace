import { z } from 'zod';
import path from 'path';

try {
  (process as any).loadEnvFile?.(path.resolve(process.cwd(), '.env'));
  (process as any).loadEnvFile?.(path.resolve(process.cwd(), '../../.env'));
} catch {}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().default('postgresql://haat:haat@localhost:5432/haat?schema=public'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SEARCH_DRIVER: z.enum(['es', 'pg']).default('pg'),
  ELASTICSEARCH_URL: z.string().default('http://localhost:9200'),
  JWT_ACCESS_SECRET: z.string().min(16).default('haat-super-secret-access-token-key-32-chars-min!'),
  JWT_REFRESH_SECRET: z.string().min(16).default('haat-super-secret-refresh-token-key-32-chars-min!'),
  AWS_REGION: z.string().default('ap-south-1'),
  S3_BUCKET: z.string().default('haat-products'),
  S3_PUBLIC_BASE: z.string().default('http://localhost:9000/haat-products'),
  S3_ENDPOINT: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().default('minio'),
  AWS_SECRET_ACCESS_KEY: z.string().default('minio12345'),
  PAYMENT_PROVIDER: z.enum(['razorpay', 'stripe', 'fake']).default('fake'),
  RAZORPAY_KEY_ID: z.string().default('rzp_test_mockkey123'),
  RAZORPAY_KEY_SECRET: z.string().default('rzp_secret_mocksecret123'),
  RAZORPAY_WEBHOOK_SECRET: z.string().default('mock_webhook_secret_123'),
  DEFAULT_COMMISSION_BPS: z.coerce.number().default(1000),
});

const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Invalid environment variables:', parseResult.error.format());
  throw new Error('Invalid environment configuration');
}

export const env = parseResult.data;
