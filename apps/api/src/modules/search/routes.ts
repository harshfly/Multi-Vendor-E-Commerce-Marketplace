import { Router } from 'express';
import { searchProducts, suggestProducts } from '../../lib/es.js';

export const searchRouter = Router();

searchRouter.get('/', async (req, res, next) => {
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
});

searchRouter.get('/suggest', async (req, res, next) => {
  try {
    const q = (req.query.q as string) || '';
    const suggestions = await suggestProducts(q);
    return res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

