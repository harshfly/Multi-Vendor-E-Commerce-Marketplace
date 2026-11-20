import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { startOrderExpiryJob } from './jobs/expiry.js';
import { initEsIndex } from './lib/es.js';

const startServer = async () => {
  try {
    // Initialize search index if ES enabled
    await initEsIndex();

    // Start background order reservation expiry job
    startOrderExpiryJob();

    app.listen(env.PORT, () => {
      logger.info(`🚀 Haat Marketplace API listening on http://localhost:${env.PORT}`);
      logger.info(`💳 Payment Provider: ${env.PAYMENT_PROVIDER}`);
      logger.info(`🔍 Search Driver: ${env.SEARCH_DRIVER}`);
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to start server');
    process.exit(1);
  }
};

startServer();

