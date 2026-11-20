import { z } from 'zod';

// Roles & Status Enums
export const Role = {
  CUSTOMER: 'CUSTOMER',
  VENDOR: 'VENDOR',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const VendorStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  SUSPENDED: 'SUSPENDED',
  REJECTED: 'REJECTED',
} as const;
export type VendorStatus = (typeof VendorStatus)[keyof typeof VendorStatus];

export const ProductStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];

export const OrderStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const FulfilmentStatus = {
  PLACED: 'PLACED',
  PACKED: 'PACKED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;
export type FulfilmentStatus = (typeof FulfilmentStatus)[keyof typeof FulfilmentStatus];

export const PaymentStatus = {
  CREATED: 'CREATED',
  AUTHORIZED: 'AUTHORIZED',
  CAPTURED: 'CAPTURED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const CouponType = {
  PERCENT: 'PERCENT',
  FLAT: 'FLAT',
} as const;
export type CouponType = (typeof CouponType)[keyof typeof CouponType];

export const PayoutStatus = {
  PENDING: 'PENDING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
} as const;
export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];

// State machine for VendorOrder fulfillment
export const FULFILMENT_TRANSITIONS: Record<FulfilmentStatus, FulfilmentStatus[]> = {
  PLACED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export const canMoveFulfilment = (from: FulfilmentStatus, to: FulfilmentStatus): boolean => {
  return FULFILMENT_TRANSITIONS[from]?.includes(to) ?? false;
};

// Money helpers - all monetary values stored in paise (integers)
export const formatINR = (paise: number): string => {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(rupees);
};

export const paiseToRupees = (paise: number): number => {
  return Math.round(paise) / 100;
};

export const rupeesToPaise = (rupees: number): number => {
  return Math.round(rupees * 100);
};

// Commission & Split calculation with remainder invariant check
export interface VendorSplitInput {
  vendorId: string;
  subtotalPaise: number;
  commissionBps: number;
}

export interface VendorSplitResult {
  vendorId: string;
  subtotalPaise: number;
  discountPaise: number;
  commissionPaise: number;
  payoutPaise: number;
}

export interface OrderFinancials {
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  vendorSplits: VendorSplitResult[];
}

export const calculateOrderFinancials = (
  vendorInputs: VendorSplitInput[],
  totalDiscountPaise: number = 0,
  shippingPaise: number = 0
): OrderFinancials => {
  const subtotalPaise = vendorInputs.reduce((sum, v) => sum + v.subtotalPaise, 0);
  const actualDiscountPaise = Math.min(totalDiscountPaise, subtotalPaise);
  const totalPaise = subtotalPaise - actualDiscountPaise + shippingPaise;

  if (vendorInputs.length === 0) {
    return {
      subtotalPaise: 0,
      discountPaise: 0,
      shippingPaise,
      totalPaise: shippingPaise,
      vendorSplits: [],
    };
  }

  // 1. Pro-rata discount allocation
  let remainingDiscount = actualDiscountPaise;
  const vendorSplits: VendorSplitResult[] = vendorInputs.map((v) => {
    let allocatedDiscount = 0;
    if (subtotalPaise > 0) {
      allocatedDiscount = Math.floor((v.subtotalPaise / subtotalPaise) * actualDiscountPaise);
    }
    return {
      vendorId: v.vendorId,
      subtotalPaise: v.subtotalPaise,
      discountPaise: allocatedDiscount,
      commissionPaise: 0,
      payoutPaise: 0,
    };
  });

  // Calculate sum of allocated discounts and assign remainder to largest vendor
  const sumAllocatedDiscount = vendorSplits.reduce((acc, v) => acc + v.discountPaise, 0);
  const discountRemainder = remainingDiscount - sumAllocatedDiscount;
  if (discountRemainder > 0) {
    // Find vendor with highest subtotal
    let maxIdx = 0;
    for (let i = 1; i < vendorSplits.length; i++) {
      if (vendorSplits[i].subtotalPaise > vendorSplits[maxIdx].subtotalPaise) {
        maxIdx = i;
      }
    }
    vendorSplits[maxIdx].discountPaise += discountRemainder;
  }

  // 2. Commission & payout per vendor
  for (let i = 0; i < vendorSplits.length; i++) {
    const split = vendorSplits[i];
    const input = vendorInputs[i];
    const effectiveVendorSubtotal = Math.max(0, split.subtotalPaise - split.discountPaise);
    const commission = Math.round((effectiveVendorSubtotal * input.commissionBps) / 10000);
    const payout = effectiveVendorSubtotal - commission;

    split.commissionPaise = commission;
    split.payoutPaise = payout;
  }

  return {
    subtotalPaise,
    discountPaise: actualDiscountPaise,
    shippingPaise,
    totalPaise,
    vendorSplits,
  };
};

// ----------------- ZOD SCHEMAS -----------------

// Auth
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

// Vendor
export const vendorApplySchema = z.object({
  storeName: z.string().min(3, 'Store name must be at least 3 characters').max(60),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
});
export type VendorApplyInput = z.infer<typeof vendorApplySchema>;

export const vendorUpdateSchema = z.object({
  storeName: z.string().min(3).max(60).optional(),
  description: z.string().optional(),
  logoUrl: z.string().url().optional(),
});
export type VendorUpdateInput = z.infer<typeof vendorUpdateSchema>;

export const payoutAccountSchema = z.object({
  accountNumber: z.string().min(8).max(20),
  ifscCode: z.string().min(4).max(11),
  beneficiaryName: z.string().min(3),
});
export type PayoutAccountInput = z.infer<typeof payoutAccountSchema>;

// Address
export const addressSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10).max(15),
  line1: z.string().min(3),
  line2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().min(5).max(10),
  isDefault: z.boolean().optional().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;

// Products
export const createProductSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  pricePaise: z.number().int().positive('Price must be greater than 0'),
  mrpPaise: z.number().int().positive().optional(),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  imageUrls: z.array(z.string().url()).min(1, 'At least one image is required'),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial().extend({
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// Cart
export const addToCartSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99).default(1),
});
export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0).max(99),
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const applyCouponSchema = z.object({
  code: z.string().min(2).max(30),
});
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;

// Checkout
export const checkoutSchema = z.object({
  addressId: z.string().optional(),
  shippingAddress: addressSchema.optional(),
  couponCode: z.string().optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

// Fulfillment status update
export const updateFulfilmentStatusSchema = z.object({
  status: z.enum(['PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
  trackingNumber: z.string().optional(),
  note: z.string().optional(),
});
export type UpdateFulfilmentStatusInput = z.infer<typeof updateFulfilmentStatusSchema>;

// Reviews
export const createReviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(120).optional(),
  body: z.string().min(5, 'Review must be at least 5 characters').max(1000),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// Admin actions
export const adminUpdateVendorSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED']).optional(),
  commissionBps: z.number().int().min(0).max(5000).optional(), // max 50%
});
export type AdminUpdateVendorInput = z.infer<typeof adminUpdateVendorSchema>;

// Presigned Upload
export const presignUploadSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().regex(/^image\/(jpeg|png|webp|gif|avif)$/i, 'Only JPEG, PNG, WEBP, GIF, AVIF images are allowed'),
  size: z.number().int().max(10 * 1024 * 1024, 'Image size cannot exceed 10MB'),
});
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;

