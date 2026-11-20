import crypto from 'crypto';
import { prisma } from '../../lib/prisma.js';
import { redis } from '../../lib/redis.js';
import { indexProduct } from '../../lib/es.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../middleware/error.js';
import { CreateProductInput, UpdateProductInput } from '@haat/shared';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class ProductService {
  async getCategories() {
    const cached = await redis.get('categories:tree');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }

    const categories = await prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            _count: { select: { products: { where: { status: 'ACTIVE' } } } },
          },
        },
        _count: { select: { products: { where: { status: 'ACTIVE' } } } },
      },
      orderBy: { name: 'asc' },
    });

    await redis.set('categories:tree', JSON.stringify(categories), 'EX', 60);
    return categories;
  }

  async getBySlug(slug: string) {
    const cached = await redis.get(`product:${slug}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {}
    }

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        vendor: {
          select: {
            id: true,
            storeName: true,
            slug: true,
            logoUrl: true,
            description: true,
          },
        },
        images: { orderBy: { position: 'asc' } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!product || product.status === 'ARCHIVED') {
      throw new NotFoundError('Product not found');
    }

    await redis.set(`product:${slug}`, JSON.stringify(product), 'EX', 60);
    return product;
  }

  async create(userId: string, input: CreateProductInput) {
    const vendor = await prisma.vendor.findUnique({ where: { userId } });
    if (!vendor || vendor.status !== 'APPROVED') {
      throw new ForbiddenError('Only approved vendors can create products');
    }

    const baseSlug = slugify(input.title);
    const shortId = crypto.randomUUID().slice(0, 6);
    const slug = `${baseSlug}-${shortId}`;

    const product = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        categoryId: input.categoryId,
        title: input.title,
        slug,
        description: input.description,
        pricePaise: input.pricePaise,
        mrpPaise: input.mrpPaise,
        stock: input.stock,
        status: 'ACTIVE',
        images: {
          create: input.imageUrls.map((url, idx) => ({
            url,
            key: `products/${vendor.id}/${slug}-${idx}`,
            position: idx,
          })),
        },
      },
      include: {
        images: true,
        category: true,
        vendor: true,
      },
    });

    // Invalidate caches & index
    await redis.del('categories:tree');
    await indexProduct(product.id);

    return product;
  }

  async update(id: string, userId: string, userRole: string, input: UpdateProductInput) {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { vendor: true },
    });
    if (!existing) throw new NotFoundError('Product not found');

    if (userRole !== 'ADMIN' && existing.vendor.userId !== userId) {
      throw new ForbiddenError('You can only update your own products');
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.description && { description: input.description }),
        ...(input.pricePaise !== undefined && { pricePaise: input.pricePaise }),
        ...(input.mrpPaise !== undefined && { mrpPaise: input.mrpPaise }),
        ...(input.stock !== undefined && { stock: input.stock }),
        ...(input.categoryId && { categoryId: input.categoryId }),
        ...(input.status && { status: input.status as any }),
      },
      include: {
        images: true,
        category: true,
        vendor: true,
      },
    });

    if (input.imageUrls && input.imageUrls.length > 0) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      await prisma.productImage.createMany({
        data: input.imageUrls.map((url, idx) => ({
          productId: id,
          url,
          key: `products/${existing.vendorId}/${id}-${idx}`,
          position: idx,
        })),
      });
    }

    await redis.del(`product:${existing.slug}`);
    await redis.del('categories:tree');
    await indexProduct(id);

    return updated;
  }

  async delete(id: string, userId: string, userRole: string) {
    const existing = await prisma.product.findUnique({
      where: { id },
      include: { vendor: true },
    });
    if (!existing) throw new NotFoundError('Product not found');

    if (userRole !== 'ADMIN' && existing.vendor.userId !== userId) {
      throw new ForbiddenError('You can only delete your own products');
    }

    // Soft delete via ARCHIVED
    await prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    await redis.del(`product:${existing.slug}`);
    await indexProduct(id);

    return { success: true };
  }

  async getVendorProducts(userId: string) {
    const vendor = await prisma.vendor.findUnique({ where: { userId } });
    if (!vendor) throw new ForbiddenError('Not a vendor');

    const products = await prisma.product.findMany({
      where: { vendorId: vendor.id, status: { not: 'ARCHIVED' } },
      orderBy: { createdAt: 'desc' },
      include: {
        images: { orderBy: { position: 'asc' } },
        category: true,
      },
    });

    return products;
  }
}

export const productService = new ProductService();

