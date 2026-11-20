import { Router } from 'express';
import { productController } from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { requireRole } from '../../middleware/requireRole.js';
import { validateBody } from '../../middleware/validate.js';
import { createProductSchema, updateProductSchema, presignUploadSchema, Role } from '@haat/shared';

export const productRouter = Router();

// Public
productRouter.get('/', (req, res, next) => productController.list(req, res, next));
productRouter.get('/categories/tree', (req, res, next) => productController.getCategories(req, res, next));
productRouter.get('/:slug', (req, res, next) => productController.getBySlug(req, res, next));

// Vendor / Admin
productRouter.get('/vendor/mine', authenticate, requireRole(Role.VENDOR, Role.ADMIN), (req, res, next) =>
  productController.getVendorProducts(req, res, next)
);

productRouter.post('/', authenticate, requireRole(Role.VENDOR, Role.ADMIN), validateBody(createProductSchema), (req, res, next) =>
  productController.create(req, res, next)
);

productRouter.patch('/:id', authenticate, requireRole(Role.VENDOR, Role.ADMIN), validateBody(updateProductSchema), (req, res, next) =>
  productController.update(req, res, next)
);

productRouter.delete('/:id', authenticate, requireRole(Role.VENDOR, Role.ADMIN), (req, res, next) =>
  productController.delete(req, res, next)
);

productRouter.post('/uploads/presign', authenticate, requireRole(Role.VENDOR, Role.ADMIN), validateBody(presignUploadSchema), (req, res, next) =>
  productController.presignUpload(req, res, next)
);

