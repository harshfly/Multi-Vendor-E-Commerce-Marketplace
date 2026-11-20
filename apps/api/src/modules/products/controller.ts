import { Request, Response, NextFunction } from 'express';
import { productService } from './service.js';
import { searchProducts } from '../../lib/es.js';
import { createPresignedUploadUrl } from '../../lib/s3.js';
import { prisma } from '../../lib/prisma.js';

export class ProductController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query.q as string | undefined;
      const category = req.query.category as string | undefined;
      const minPrice = req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined;
      const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined;
      const rating = req.query.rating ? parseFloat(req.query.rating as string) : undefined;
      const vendor = req.query.vendor as string | undefined;
      const inStock = req.query.inStock === 'true';
      const sort = req.query.sort as any;
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;

      const result = await searchProducts({
        q,
        category,
        minPrice,
        maxPrice,
        rating,
        vendor,
        inStock,
        sort,
        page,
        limit,
      });

      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getBySlug(req.params.slug);
      return res.json({ product });
    } catch (err) {
      next(err);
    }
  }

  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await productService.getCategories();
      return res.json({ categories });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.create(req.user!.userId, req.body);
      return res.status(201).json({ product });
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.update(
        req.params.id,
        req.user!.userId,
        req.user!.role,
        req.body
      );
      return res.json({ product });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productService.delete(
        req.params.id,
        req.user!.userId,
        req.user!.role
      );
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getVendorProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await productService.getVendorProducts(req.user!.userId);
      return res.json({ products });
    } catch (err) {
      next(err);
    }
  }

  async presignUpload(req: Request, res: Response, next: NextFunction) {
    try {
      const { contentType } = req.body;
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.userId } });
      const vendorId = vendor ? vendor.id : req.user!.userId;
      const result = await createPresignedUploadUrl(vendorId, contentType);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const productController = new ProductController();

