import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, ArrowRight, Tag, ShieldCheck } from 'lucide-react';
import { useCart } from '../lib/cart-context.js';
import { formatINR } from '../lib/money.js';
import { Button } from '../components/ui/Button.js';
import { QtyStepper } from '../components/ui/QtyStepper.js';
import { EmptyState } from '../components/ui/EmptyState.js';

export const CartPage: React.FC = () => {
  const { cart, updateItem, removeItem, applyCoupon, removeCoupon } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const navigate = useNavigate();

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setIsApplying(true);
    try {
      await applyCoupon(couponCode.trim());
      setCouponCode('');
    } catch {}
    finally {
      setIsApplying(false);
    }
  };

  if (cart.lines.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Your Cart is Empty"
          description="You haven't added any artisan goods or electronics to your bag yet."
          actionLabel="Explore Marketplace"
          onAction={() => navigate('/search')}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="pb-4 border-b border-line flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">Shopping Cart</h1>
          <p className="text-xs text-ink/50 mt-0.5">
            {cart.itemCount} items from {cart.vendors.length} {cart.vendors.length === 1 ? 'store' : 'stores'}
          </p>
        </div>
        <Link to="/search" className="text-xs font-semibold text-brand hover:underline">
          Continue Shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items Grouped by Vendor */}
        <div className="lg:col-span-2 space-y-6">
          {cart.vendors.map((vendorGroup) => (
            <div
              key={vendorGroup.vendorId}
              className="bg-surface border border-line rounded-card overflow-hidden shadow-xs"
            >
              <div className="bg-paper px-4 py-3 border-b border-line flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink">
                    Package from{' '}
                    <Link
                      to={`/vendors/${vendorGroup.vendorSlug}`}
                      className="text-brand hover:underline"
                    >
                      {vendorGroup.vendorName}
                    </Link>
                  </span>
                  <span className="text-[10px] bg-brand-light text-brand font-semibold px-2 py-0.5 rounded">
                    Direct Dispatch
                  </span>
                </div>
                <span className="text-xs font-bold tabular-nums text-ink/80">
                  Subtotal: {formatINR(vendorGroup.vendorSubtotalPaise)}
                </span>
              </div>

              <div className="divide-y divide-line/60">
                {vendorGroup.lines.map((line) => (
                  <div key={line.productId} className="p-4 flex gap-4">
                    <img
                      src={line.product.imageUrl}
                      alt={line.product.title}
                      className="w-20 h-20 object-cover rounded border border-line bg-paper flex-shrink-0"
                    />

                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <Link
                            to={`/products/${line.product.slug}`}
                            className="font-heading font-semibold text-sm text-ink hover:text-brand line-clamp-1"
                          >
                            {line.product.title}
                          </Link>
                          <p className="text-xs text-brand font-bold tabular-nums mt-0.5">
                            {formatINR(line.product.pricePaise)}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(line.productId)}
                          className="text-ink/40 hover:text-danger p-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <QtyStepper
                          value={line.quantity}
                          max={line.product.stock}
                          onChange={(qty) => updateItem(line.productId, qty)}
                        />
                        <span className="text-sm font-bold tabular-nums text-ink">
                          {formatINR(line.itemTotalPaise)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Order Summary */}
        <div className="space-y-4">
          <div className="bg-surface border border-line rounded-card p-5 space-y-4 shadow-xs sticky top-24">
            <h2 className="font-heading font-bold text-base text-ink pb-3 border-b border-line">
              Order Summary
            </h2>

            {/* Coupon Box */}
            {cart.appliedCoupon ? (
              <div className="flex items-center justify-between bg-success-light border border-success/30 px-3 py-2 rounded-input text-xs text-success">
                <div className="flex items-center gap-1.5 font-medium">
                  <Tag className="w-4 h-4" />
                  <span>Coupon <strong>{cart.appliedCoupon.code}</strong> applied</span>
                </div>
                <button
                  onClick={removeCoupon}
                  className="text-xs font-semibold text-danger hover:underline ml-2"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Coupon code (e.g. WELCOME10)"
                  className="flex-1 border border-line rounded-input px-3 py-2 text-xs text-ink placeholder:text-ink/40 focus:ring-1 focus:ring-brand focus:outline-none uppercase"
                />
                <Button type="submit" variant="outline" size="sm" isLoading={isApplying}>
                  Apply
                </Button>
              </form>
            )}

            {/* Calculations */}
            <div className="space-y-2 text-xs text-ink/70 pt-2 border-t border-line">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="tabular-nums font-medium text-ink">{formatINR(cart.subtotalPaise)}</span>
              </div>

              {cart.discountPaise > 0 && (
                <div className="flex justify-between text-danger font-medium">
                  <span>Coupon Discount</span>
                  <span className="tabular-nums">- {formatINR(cart.discountPaise)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Estimated Shipping</span>
                <span className="tabular-nums font-medium text-ink">
                  {cart.shippingPaise === 0 ? 'FREE' : formatINR(cart.shippingPaise)}
                </span>
              </div>

              <div className="flex justify-between text-base font-bold text-ink pt-3 border-t border-line">
                <span>Total Amount</span>
                <span className="tabular-nums text-brand">{formatINR(cart.totalPaise)}</span>
              </div>
            </div>

            <Button
              onClick={() => navigate('/checkout')}
              size="lg"
              className="w-full flex items-center justify-center gap-2 font-bold"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <div className="pt-2 text-[11px] text-ink/50 flex items-center justify-center gap-1.5 text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-brand" />
              <span>Safe & Secure Escrow-Backed Checkout</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

