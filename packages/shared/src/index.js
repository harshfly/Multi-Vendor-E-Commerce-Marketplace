"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presignUploadSchema = exports.adminUpdateVendorSchema = exports.createReviewSchema = exports.updateFulfilmentStatusSchema = exports.checkoutSchema = exports.applyCouponSchema = exports.updateCartItemSchema = exports.addToCartSchema = exports.updateProductSchema = exports.createProductSchema = exports.addressSchema = exports.payoutAccountSchema = exports.vendorUpdateSchema = exports.vendorApplySchema = exports.loginSchema = exports.registerSchema = exports.calculateOrderFinancials = exports.rupeesToPaise = exports.paiseToRupees = exports.formatINR = exports.canMoveFulfilment = exports.FULFILMENT_TRANSITIONS = exports.PayoutStatus = exports.CouponType = exports.PaymentStatus = exports.FulfilmentStatus = exports.OrderStatus = exports.ProductStatus = exports.VendorStatus = exports.Role = void 0;
const zod_1 = require("zod");
// Roles & Status Enums
exports.Role = {
    CUSTOMER: 'CUSTOMER',
    VENDOR: 'VENDOR',
    ADMIN: 'ADMIN',
};
exports.VendorStatus = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    SUSPENDED: 'SUSPENDED',
    REJECTED: 'REJECTED',
};
exports.ProductStatus = {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED',
};
exports.OrderStatus = {
    PENDING_PAYMENT: 'PENDING_PAYMENT',
    PAID: 'PAID',
    CANCELLED: 'CANCELLED',
    REFUNDED: 'REFUNDED',
};
exports.FulfilmentStatus = {
    PLACED: 'PLACED',
    PACKED: 'PACKED',
    SHIPPED: 'SHIPPED',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
};
exports.PaymentStatus = {
    CREATED: 'CREATED',
    AUTHORIZED: 'AUTHORIZED',
    CAPTURED: 'CAPTURED',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED',
};
exports.CouponType = {
    PERCENT: 'PERCENT',
    FLAT: 'FLAT',
};
exports.PayoutStatus = {
    PENDING: 'PENDING',
    PROCESSED: 'PROCESSED',
    FAILED: 'FAILED',
};
// State machine for VendorOrder fulfillment
exports.FULFILMENT_TRANSITIONS = {
    PLACED: ['PACKED', 'CANCELLED'],
    PACKED: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
};
const canMoveFulfilment = (from, to) => {
    return exports.FULFILMENT_TRANSITIONS[from]?.includes(to) ?? false;
};
exports.canMoveFulfilment = canMoveFulfilment;
// Money helpers - all monetary values stored in paise (integers)
const formatINR = (paise) => {
    const rupees = paise / 100;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
        minimumFractionDigits: 0,
    }).format(rupees);
};
exports.formatINR = formatINR;
const paiseToRupees = (paise) => {
    return Math.round(paise) / 100;
};
exports.paiseToRupees = paiseToRupees;
const rupeesToPaise = (rupees) => {
    return Math.round(rupees * 100);
};
exports.rupeesToPaise = rupeesToPaise;
const calculateOrderFinancials = (vendorInputs, totalDiscountPaise = 0, shippingPaise = 0) => {
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
    const vendorSplits = vendorInputs.map((v) => {
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
exports.calculateOrderFinancials = calculateOrderFinancials;
// ----------------- ZOD SCHEMAS -----------------
// Auth
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters long'),
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
// Vendor
exports.vendorApplySchema = zod_1.z.object({
    storeName: zod_1.z.string().min(3, 'Store name must be at least 3 characters').max(60),
    description: zod_1.z.string().optional(),
    logoUrl: zod_1.z.string().url().optional(),
});
exports.vendorUpdateSchema = zod_1.z.object({
    storeName: zod_1.z.string().min(3).max(60).optional(),
    description: zod_1.z.string().optional(),
    logoUrl: zod_1.z.string().url().optional(),
});
exports.payoutAccountSchema = zod_1.z.object({
    accountNumber: zod_1.z.string().min(8).max(20),
    ifscCode: zod_1.z.string().min(4).max(11),
    beneficiaryName: zod_1.z.string().min(3),
});
// Address
exports.addressSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(2),
    phone: zod_1.z.string().min(10).max(15),
    line1: zod_1.z.string().min(3),
    line2: zod_1.z.string().optional(),
    city: zod_1.z.string().min(2),
    state: zod_1.z.string().min(2),
    pincode: zod_1.z.string().min(5).max(10),
    isDefault: zod_1.z.boolean().optional().default(false),
});
// Products
exports.createProductSchema = zod_1.z.object({
    categoryId: zod_1.z.string().min(1, 'Category is required'),
    title: zod_1.z.string().min(3, 'Title must be at least 3 characters').max(200),
    description: zod_1.z.string().min(10, 'Description must be at least 10 characters'),
    pricePaise: zod_1.z.number().int().positive('Price must be greater than 0'),
    mrpPaise: zod_1.z.number().int().positive().optional(),
    stock: zod_1.z.number().int().min(0, 'Stock cannot be negative'),
    imageUrls: zod_1.z.array(zod_1.z.string().url()).min(1, 'At least one image is required'),
});
exports.updateProductSchema = exports.createProductSchema.partial().extend({
    status: zod_1.z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
});
// Cart
exports.addToCartSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1),
    quantity: zod_1.z.number().int().min(1).max(99).default(1),
});
exports.updateCartItemSchema = zod_1.z.object({
    quantity: zod_1.z.number().int().min(0).max(99),
});
exports.applyCouponSchema = zod_1.z.object({
    code: zod_1.z.string().min(2).max(30),
});
// Checkout
exports.checkoutSchema = zod_1.z.object({
    addressId: zod_1.z.string().optional(),
    shippingAddress: exports.addressSchema.optional(),
    couponCode: zod_1.z.string().optional(),
});
// Fulfillment status update
exports.updateFulfilmentStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    trackingNumber: zod_1.z.string().optional(),
    note: zod_1.z.string().optional(),
});
// Reviews
exports.createReviewSchema = zod_1.z.object({
    productId: zod_1.z.string().min(1),
    rating: zod_1.z.number().int().min(1).max(5),
    title: zod_1.z.string().max(120).optional(),
    body: zod_1.z.string().min(5, 'Review must be at least 5 characters').max(1000),
});
// Admin actions
exports.adminUpdateVendorSchema = zod_1.z.object({
    status: zod_1.z.enum(['PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED']).optional(),
    commissionBps: zod_1.z.number().int().min(0).max(5000).optional(), // max 50%
});
// Presigned Upload
exports.presignUploadSchema = zod_1.z.object({
    filename: zod_1.z.string().min(1),
    contentType: zod_1.z.string().regex(/^image\/(jpeg|png|webp|gif|avif)$/i, 'Only JPEG, PNG, WEBP, GIF, AVIF images are allowed'),
    size: zod_1.z.number().int().max(10 * 1024 * 1024, 'Image size cannot exceed 10MB'),
});
