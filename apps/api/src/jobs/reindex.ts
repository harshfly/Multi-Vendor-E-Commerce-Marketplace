import { prisma } from '../lib/prisma.js';
import { esClient, ES_INDEX, initEsIndex } from '../lib/es.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

export const reindexAllProducts = async () => {
  logger.info('Starting full product reindexing...');

  if (env.SEARCH_DRIVER !== 'es') {
    logger.info('SEARCH_DRIVER is set to "pg". Elasticsearch reindexing skipped.');
    return;
  }

  await initEsIndex();

  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    include: {
      category: true,
      vendor: true,
      images: { orderBy: { position: 'asc' }, take: 1 },
    },
  });

  logger.info({ count: products.length }, 'Indexing active products into Elasticsearch');

  for (const product of products) {
    try {
      await esClient.index({
        index: ES_INDEX,
        id: product.id,
        document: {
          id: product.id,
          title: product.title,
          slug: product.slug,
          description: product.description,
          categoryId: product.categoryId,
          categorySlug: product.category.slug,
          vendorId: product.vendorId,
          vendorName: product.vendor.storeName,
          pricePaise: product.pricePaise,
          mrpPaise: product.mrpPaise,
          ratingAvg: product.ratingAvg,
          ratingCount: product.ratingCount,
          inStock: product.stock > 0,
          imageUrl: product.images[0]?.url || '',
          status: product.status,
          createdAt: product.createdAt,
        },
      });
    } catch (err: any) {
      logger.error({ err: err.message, productId: product.id }, 'Failed to index product');
    }
  }

  logger.info('Reindexing complete.');
};

// Allow CLI execution
if (process.argv[1]?.endsWith('reindex.ts')) {
  reindexAllProducts()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

