import { z } from 'zod';
export declare const Role: {
    readonly CUSTOMER: "CUSTOMER";
    readonly VENDOR: "VENDOR";
    readonly ADMIN: "ADMIN";
};
export type Role = (typeof Role)[keyof typeof Role];
export declare const VendorStatus: {
    readonly PENDING: "PENDING";
    readonly APPROVED: "APPROVED";
    readonly SUSPENDED: "SUSPENDED";
    readonly REJECTED: "REJECTED";
};
export type VendorStatus = (typeof VendorStatus)[keyof typeof VendorStatus];
export declare const ProductStatus: {
    readonly DRAFT: "DRAFT";
    readonly ACTIVE: "ACTIVE";
    readonly ARCHIVED: "ARCHIVED";
};
export type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus];
export declare const OrderStatus: {
    readonly PENDING_PAYMENT: "PENDING_PAYMENT";
    readonly PAID: "PAID";
    readonly CANCELLED: "CANCELLED";
    readonly REFUNDED: "REFUNDED";
};
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
export declare const FulfilmentStatus: {
    readonly PLACED: "PLACED";
    readonly PACKED: "PACKED";
    readonly SHIPPED: "SHIPPED";
    readonly DELIVERED: "DELIVERED";
    readonly CANCELLED: "CANCELLED";
};
export type FulfilmentStatus = (typeof FulfilmentStatus)[keyof typeof FulfilmentStatus];
export declare const PaymentStatus: {
    readonly CREATED: "CREATED";
    readonly AUTHORIZED: "AUTHORIZED";
    readonly CAPTURED: "CAPTURED";
    readonly FAILED: "FAILED";
    readonly REFUNDED: "REFUNDED";
};
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
export declare const CouponType: {
    readonly PERCENT: "PERCENT";
    readonly FLAT: "FLAT";
};
export type CouponType = (typeof CouponType)[keyof typeof CouponType];
export declare const PayoutStatus: {
    readonly PENDING: "PENDING";
    readonly PROCESSED: "PROCESSED";
    readonly FAILED: "FAILED";
};
export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];
export declare const FULFILMENT_TRANSITIONS: Record<FulfilmentStatus, FulfilmentStatus[]>;
export declare const canMoveFulfilment: (from: FulfilmentStatus, to: FulfilmentStatus) => boolean;
export declare const formatINR: (paise: number) => string;
export declare const paiseToRupees: (paise: number) => number;
export declare const rupeesToPaise: (rupees: number) => number;
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
export declare const calculateOrderFinancials: (vendorInputs: VendorSplitInput[], totalDiscountPaise?: number, shippingPaise?: number) => OrderFinancials;
export declare const registerSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    name: string;
}, {
    email: string;
    password: string;
    name: string;
}>;
export type RegisterInput = z.infer<typeof registerSchema>;
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginInput = z.infer<typeof loginSchema>;
export declare const vendorApplySchema: z.ZodObject<{
    storeName: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    logoUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    storeName: string;
    description?: string | undefined;
    logoUrl?: string | undefined;
}, {
    storeName: string;
    description?: string | undefined;
    logoUrl?: string | undefined;
}>;
export type VendorApplyInput = z.infer<typeof vendorApplySchema>;
export declare const vendorUpdateSchema: z.ZodObject<{
    storeName: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    logoUrl: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    storeName?: string | undefined;
    description?: string | undefined;
    logoUrl?: string | undefined;
}, {
    storeName?: string | undefined;
    description?: string | undefined;
    logoUrl?: string | undefined;
}>;
export type VendorUpdateInput = z.infer<typeof vendorUpdateSchema>;
export declare const payoutAccountSchema: z.ZodObject<{
    accountNumber: z.ZodString;
    ifscCode: z.ZodString;
    beneficiaryName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    accountNumber: string;
    ifscCode: string;
    beneficiaryName: string;
}, {
    accountNumber: string;
    ifscCode: string;
    beneficiaryName: string;
}>;
export type PayoutAccountInput = z.infer<typeof payoutAccountSchema>;
export declare const addressSchema: z.ZodObject<{
    fullName: z.ZodString;
    phone: z.ZodString;
    line1: z.ZodString;
    line2: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    state: z.ZodString;
    pincode: z.ZodString;
    isDefault: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    fullName: string;
    phone: string;
    line1: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
    line2?: string | undefined;
}, {
    fullName: string;
    phone: string;
    line1: string;
    city: string;
    state: string;
    pincode: string;
    line2?: string | undefined;
    isDefault?: boolean | undefined;
}>;
export type AddressInput = z.infer<typeof addressSchema>;
export declare const createProductSchema: z.ZodObject<{
    categoryId: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    pricePaise: z.ZodNumber;
    mrpPaise: z.ZodOptional<z.ZodNumber>;
    stock: z.ZodNumber;
    imageUrls: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    description: string;
    categoryId: string;
    title: string;
    pricePaise: number;
    stock: number;
    imageUrls: string[];
    mrpPaise?: number | undefined;
}, {
    description: string;
    categoryId: string;
    title: string;
    pricePaise: number;
    stock: number;
    imageUrls: string[];
    mrpPaise?: number | undefined;
}>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export declare const updateProductSchema: z.ZodObject<{
    categoryId: z.ZodOptional<z.ZodString>;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    pricePaise: z.ZodOptional<z.ZodNumber>;
    mrpPaise: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    stock: z.ZodOptional<z.ZodNumber>;
    imageUrls: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
} & {
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "ACTIVE", "ARCHIVED"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED" | undefined;
    description?: string | undefined;
    categoryId?: string | undefined;
    title?: string | undefined;
    pricePaise?: number | undefined;
    mrpPaise?: number | undefined;
    stock?: number | undefined;
    imageUrls?: string[] | undefined;
}, {
    status?: "DRAFT" | "ACTIVE" | "ARCHIVED" | undefined;
    description?: string | undefined;
    categoryId?: string | undefined;
    title?: string | undefined;
    pricePaise?: number | undefined;
    mrpPaise?: number | undefined;
    stock?: number | undefined;
    imageUrls?: string[] | undefined;
}>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export declare const addToCartSchema: z.ZodObject<{
    productId: z.ZodString;
    quantity: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    productId: string;
    quantity: number;
}, {
    productId: string;
    quantity?: number | undefined;
}>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export declare const updateCartItemSchema: z.ZodObject<{
    quantity: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    quantity: number;
}, {
    quantity: number;
}>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export declare const applyCouponSchema: z.ZodObject<{
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
}, {
    code: string;
}>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
export declare const checkoutSchema: z.ZodObject<{
    addressId: z.ZodOptional<z.ZodString>;
    shippingAddress: z.ZodOptional<z.ZodObject<{
        fullName: z.ZodString;
        phone: z.ZodString;
        line1: z.ZodString;
        line2: z.ZodOptional<z.ZodString>;
        city: z.ZodString;
        state: z.ZodString;
        pincode: z.ZodString;
        isDefault: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        fullName: string;
        phone: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
        line2?: string | undefined;
    }, {
        fullName: string;
        phone: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        line2?: string | undefined;
        isDefault?: boolean | undefined;
    }>>;
    couponCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    addressId?: string | undefined;
    shippingAddress?: {
        fullName: string;
        phone: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        isDefault: boolean;
        line2?: string | undefined;
    } | undefined;
    couponCode?: string | undefined;
}, {
    addressId?: string | undefined;
    shippingAddress?: {
        fullName: string;
        phone: string;
        line1: string;
        city: string;
        state: string;
        pincode: string;
        line2?: string | undefined;
        isDefault?: boolean | undefined;
    } | undefined;
    couponCode?: string | undefined;
}>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export declare const updateFulfilmentStatusSchema: z.ZodObject<{
    status: z.ZodEnum<["PACKED", "SHIPPED", "DELIVERED", "CANCELLED"]>;
    trackingNumber: z.ZodOptional<z.ZodString>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "CANCELLED" | "PACKED" | "SHIPPED" | "DELIVERED";
    trackingNumber?: string | undefined;
    note?: string | undefined;
}, {
    status: "CANCELLED" | "PACKED" | "SHIPPED" | "DELIVERED";
    trackingNumber?: string | undefined;
    note?: string | undefined;
}>;
export type UpdateFulfilmentStatusInput = z.infer<typeof updateFulfilmentStatusSchema>;
export declare const createReviewSchema: z.ZodObject<{
    productId: z.ZodString;
    rating: z.ZodNumber;
    title: z.ZodOptional<z.ZodString>;
    body: z.ZodString;
}, "strip", z.ZodTypeAny, {
    productId: string;
    rating: number;
    body: string;
    title?: string | undefined;
}, {
    productId: string;
    rating: number;
    body: string;
    title?: string | undefined;
}>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export declare const adminUpdateVendorSchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["PENDING", "APPROVED", "SUSPENDED", "REJECTED"]>>;
    commissionBps: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status?: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED" | undefined;
    commissionBps?: number | undefined;
}, {
    status?: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED" | undefined;
    commissionBps?: number | undefined;
}>;
export type AdminUpdateVendorInput = z.infer<typeof adminUpdateVendorSchema>;
export declare const presignUploadSchema: z.ZodObject<{
    filename: z.ZodString;
    contentType: z.ZodString;
    size: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    filename: string;
    contentType: string;
    size: number;
}, {
    filename: string;
    contentType: string;
    size: number;
}>;
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;
