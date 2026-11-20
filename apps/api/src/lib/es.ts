import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { prisma } from './prisma.js';

export const ES_INDEX = 'haat_products';

export const esClient = new Client({
  node: env.ELASTICSEARCH_URL,
  maxRetries: 2,
  requestTimeout: 2000,
});

export const initEsIndex = async () => {
  if (env.SEARCH_DRIVER !== 'es') return;
  try {
    const exists = await esClient.indices.exists({ index: ES_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: ES_INDEX,
        body: {
          settings: {
            analysis: {
              analyzer: {
                autocomplete: {
                  type: 'custom',
                  tokenizer: 'edge_ngram_tok',
                  filter: ['lowercase'],
                },
              },
              tokenizer: {
                edge_ngram_tok: {
                  type: 'edge_ngram',
                  min_gram: 2,
                  max_gram: 15,
                  token_chars: ['letter', 'digit'],
                },
              },
            },
          },
          mappings: {
            properties: {
              title: {
                type: 'text',
                fields: {
                  ac: { type: 'text', analyzer: 'autocomplete', search_analyzer: 'standard' },
                },
              },
              description: { type: 'text' },
              categoryId: { type: 'keyword' },
              categorySlug: { type: 'keyword' },
              vendorId: { type: 'keyword' },
              vendorName: { type: 'keyword' },
              pricePaise: { type: 'integer' },
              ratingAvg: { type: 'float' },
              inStock: { type: 'boolean' },
              createdAt: { type: 'date' },
              status: { type: 'keyword' },
            },
          },
        },
      });
      logger.info('Elasticsearch index haat_products initialized');
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to initialize Elasticsearch, falling back to pg search');
  }
};

export const indexProduct = async (productId: string) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        vendor: true,
        images: { orderBy: { position: 'asc' }, take: 1 },
      },
    });

    if (!product) return;

    if (env.SEARCH_DRIVER === 'es') {
      if (product.status === 'ACTIVE') {
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
      } else {
        await esClient.delete({ index: ES_INDEX, id: product.id }).catch(() => {});
      }
    }
  } catch (err: any) {
    logger.warn({ err: err.message, productId }, 'Search index update failed (non-fatal)');
  }
};

export interface SearchParams {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  vendor?: string;
  inStock?: boolean;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating';
  page?: number;
  limit?: number;
}

export const searchProducts = async (params: SearchParams) => {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 12));
  const skip = (page - 1) * limit;

  // Try Elasticsearch if configured
  if (env.SEARCH_DRIVER === 'es') {
    try {
      const must: any[] = params.q
        ? [
            {
              multi_match: {
                query: params.q,
                fields: ['title^3', 'title.ac^2', 'description'],
                fuzziness: 'AUTO',
              },
            },
          ]
        : [{ match_all: {} }];

      const filter: any[] = [{ term: { status: 'ACTIVE' } }];
      if (params.category) filter.push({ term: { categorySlug: params.category } });
      if (params.vendor) filter.push({ term: { vendorId: params.vendor } });
      if (params.inStock) filter.push({ term: { inStock: true } });
      if (params.minPrice !== undefined || params.maxPrice !== undefined) {
        filter.push({
          range: {
            pricePaise: {
              ...(params.minPrice !== undefined && { gte: params.minPrice }),
              ...(params.maxPrice !== undefined && { lte: params.maxPrice }),
            },
          },
        });
      }
      if (params.rating !== undefined) {
        filter.push({ range: { ratingAvg: { gte: params.rating } } });
      }

      const sortMap: Record<string, any> = {
        price_asc: [{ pricePaise: 'asc' }],
        price_desc: [{ pricePaise: 'desc' }],
        newest: [{ createdAt: 'desc' }],
        rating: [{ ratingAvg: 'desc' }],
        relevance: ['_score'],
      };
      const sort = sortMap[params.sort || 'relevance'] || sortMap.relevance;

      const esResult = await esClient.search({
        index: ES_INDEX,
        from: skip,
        size: limit,
        query: { bool: { must, filter } },
        sort,
        aggs: {
          categories: { terms: { field: 'categorySlug', size: 20 } },
          vendors: { terms: { field: 'vendorName', size: 20 } },
          price_stats: { stats: { field: 'pricePaise' } },
        },
      });

      const total = typeof esResult.hits.total === 'number' ? esResult.hits.total : esResult.hits.total?.value || 0;
      const items = esResult.hits.hits.map((h: any) => h._source);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        facets: {
          categories: (esResult.aggregations?.categories as any)?.buckets || [],
          vendors: (esResult.aggregations?.vendors as any)?.buckets || [],
          priceStats: (esResult.aggregations?.price_stats as any) || {},
        },
      };
    } catch (err: any) {
      logger.warn({ err: err.message }, 'ES search failed, fallback to DB search');
    }
  }

  // Database fallback (SEARCH_DRIVER=pg or ES down)
  const where: any = {
    status: 'ACTIVE',
  };

  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: 'insensitive' } },
      { description: { contains: params.q, mode: 'insensitive' } },
    ];
  }
  if (params.category) {
    where.category = { slug: params.category };
  }
  if (params.vendor) {
    where.vendorId = params.vendor;
  }
  if (params.inStock) {
    where.stock = { gt: 0 };
  }
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    where.pricePaise = {
      ...(params.minPrice !== undefined && { gte: params.minPrice }),
      ...(params.maxPrice !== undefined && { lte: params.maxPrice }),
    };
  }
  if (params.rating !== undefined) {
    where.ratingAvg = { gte: params.rating };
  }

  let orderBy: any = { createdAt: 'desc' };
  if (params.sort === 'price_asc') orderBy = { pricePaise: 'asc' };
  if (params.sort === 'price_desc') orderBy = { pricePaise: 'desc' };
  if (params.sort === 'rating') orderBy = { ratingAvg: 'desc' };
  if (params.sort === 'newest') orderBy = { createdAt: 'desc' };

  const [total, products, categories, vendors] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        category: true,
        vendor: { select: { id: true, storeName: true, slug: true } },
        images: { orderBy: { position: 'asc' } },
      },
    }),
    prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { products: { where: { status: 'ACTIVE' } } } },
      },
      take: 20,
    }),
    prisma.vendor.findMany({
      where: { status: 'APPROVED' },
      select: {
        id: true,
        storeName: true,
        _count: { select: { products: { where: { status: 'ACTIVE' } } } },
      },
      take: 20,
    }),
  ]);

  const items = products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    categoryId: p.categoryId,
    categorySlug: p.category.slug,
    vendorId: p.vendorId,
    vendorName: p.vendor.storeName,
    pricePaise: p.pricePaise,
    mrpPaise: p.mrpPaise,
    ratingAvg: p.ratingAvg,
    ratingCount: p.ratingCount,
    stock: p.stock,
    inStock: p.stock > 0,
    imageUrl: p.images[0]?.url || '',
    images: p.images,
    createdAt: p.createdAt,
  }));

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    facets: {
      categories: categories.map((c) => ({ key: c.slug, label: c.name, doc_count: c._count.products })),
      vendors: vendors.map((v) => ({ key: v.id, label: v.storeName, doc_count: v._count.products })),
    },
  };
};

export const suggestProducts = async (q: string) => {
  if (!q || q.trim().length === 0) return [];
  const query = q.trim();

  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { category: { name: { contains: query, mode: 'insensitive' } } },
      ],
    },
    take: 8,
    select: {
      id: true,
      title: true,
      slug: true,
      pricePaise: true,
      category: { select: { name: true, slug: true } },
      images: { take: 1, orderBy: { position: 'asc' }, select: { url: true } },
    },
  });

  return products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    pricePaise: p.pricePaise,
    category: p.category.name,
    imageUrl: p.images[0]?.url || '',
  }));
};
