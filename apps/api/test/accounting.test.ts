import { describe, it, expect } from 'vitest';
import {
  canMoveFulfilment,
  calculateOrderFinancials,
  formatINR,
  paiseToRupees,
  rupeesToPaise,
  VendorSplitInput,
} from '@haat/shared';

describe('Order State Machine', () => {
  it('allows valid fulfillment transitions', () => {
    expect(canMoveFulfilment('PLACED', 'PACKED')).toBe(true);
    expect(canMoveFulfilment('PLACED', 'CANCELLED')).toBe(true);
    expect(canMoveFulfilment('PACKED', 'SHIPPED')).toBe(true);
    expect(canMoveFulfilment('PACKED', 'CANCELLED')).toBe(true);
    expect(canMoveFulfilment('SHIPPED', 'DELIVERED')).toBe(true);
  });

  it('rejects illegal fulfillment jumps', () => {
    expect(canMoveFulfilment('PLACED', 'DELIVERED')).toBe(false);
    expect(canMoveFulfilment('SHIPPED', 'CANCELLED')).toBe(false);
    expect(canMoveFulfilment('DELIVERED', 'PLACED')).toBe(false);
    expect(canMoveFulfilment('CANCELLED', 'SHIPPED')).toBe(false);
  });
});

describe('Money & Accounting Invariants', () => {
  it('formats INR prices cleanly', () => {
    expect(formatINR(100000)).toMatch(/₹\s?1,000/);
    expect(formatINR(449900)).toMatch(/₹\s?4,499/);
    expect(formatINR(50)).toMatch(/₹\s?0\.5/);
  });

  it('converts paise to rupees and vice versa without floating precision error', () => {
    expect(paiseToRupees(15050)).toBe(150.5);
    expect(rupeesToPaise(150.5)).toBe(15050);
  });

  it('preserves accounting invariant: sum(vendorOrders) === order.total with pro-rata discounts & rounding', () => {
    // 3 vendors cart with odd amounts
    const vendorInputs: VendorSplitInput[] = [
      { vendorId: 'v1', subtotalPaise: 333333, commissionBps: 1000 },
      { vendorId: 'v2', subtotalPaise: 444444, commissionBps: 800 },
      { vendorId: 'v3', subtotalPaise: 222223, commissionBps: 1200 },
    ];
    const discountPaise = 100000; // ₹1,000 discount
    const shippingPaise = 5000;   // ₹50 shipping

    const financials = calculateOrderFinancials(vendorInputs, discountPaise, shippingPaise);

    // Sum of vendor subtotals after discount
    const sumEffectiveVendorSubtotals = financials.vendorSplits.reduce(
      (sum, v) => sum + (v.subtotalPaise - v.discountPaise),
      0
    );

    // INVARIANT 1: Total matches order amount
    expect(sumEffectiveVendorSubtotals + shippingPaise).toBe(financials.totalPaise);

    // INVARIANT 2: Sum of allocated discounts matches the actual discount exactly
    const sumAllocatedDiscounts = financials.vendorSplits.reduce((sum, v) => sum + v.discountPaise, 0);
    expect(sumAllocatedDiscounts).toBe(financials.discountPaise);

    // INVARIANT 3: Per vendor payout + commission === vendorSubtotal - discount
    for (const split of financials.vendorSplits) {
      expect(split.payoutPaise + split.commissionPaise).toBe(split.subtotalPaise - split.discountPaise);
    }
  });

  it('runs randomized property test over 50 varied multi-vendor baskets', () => {
    for (let test = 0; test < 50; test++) {
      const numVendors = Math.floor(Math.random() * 5) + 1;
      const vendorInputs: VendorSplitInput[] = [];

      for (let v = 0; v < numVendors; v++) {
        vendorInputs.push({
          vendorId: `vendor_${v}`,
          subtotalPaise: Math.floor(Math.random() * 500000) + 10000,
          commissionBps: Math.floor(Math.random() * 1500) + 500,
        });
      }

      const rawSubtotal = vendorInputs.reduce((sum, v) => sum + v.subtotalPaise, 0);
      const discount = Math.floor(Math.random() * (rawSubtotal * 0.5));
      const shipping = Math.random() > 0.5 ? 5000 : 0;

      const res = calculateOrderFinancials(vendorInputs, discount, shipping);

      const sumNetVendor = res.vendorSplits.reduce((acc, v) => acc + (v.subtotalPaise - v.discountPaise), 0);
      expect(sumNetVendor + shipping).toBe(res.totalPaise);
    }
  });
});

