import React, { useEffect, useState } from 'react';
import { X, Trash2, ShoppingBag, ArrowRight, Tag, Minus, Plus } from 'lucide-react';
import { useCart } from '../../lib/cart-context.js';
import { formatINR } from '../../lib/money.js';
import { Link, useNavigate } from 'react-router-dom';

export const CartDrawer: React.FC = () => {
  const { cart, isDrawerOpen, setIsDrawerOpen, updateItem, removeItem, applyCoupon, removeCoupon } = useCart();
  const [couponInput, setCouponInput] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const navigate = useNavigate();

  // Lock body scroll when open
  useEffect(() => {
    if (isDrawerOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isDrawerOpen]);

  if (!isDrawerOpen) return null;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setIsApplyingCoupon(true);
    try { await applyCoupon(couponInput.trim()); setCouponInput(''); }
    catch { /* toast shown in context */ }
    finally { setIsApplyingCoupon(false); }
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/50 backdrop-blur-sm animate-fade-in"
        onClick={() => setIsDrawerOpen(false)}
      />

      {/* Drawer panel */}
      <div className="absolute inset-y-0 right-0 w-full max-w-sm sm:max-w-md bg-surface flex flex-col shadow-modal animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-brand" />
            <h2 className="font-heading text-lg font-bold text-ink">Your Cart</h2>
            {cart.itemCount > 0 && (
              <span className="text-xs font-bold bg-brand text-white px-2 py-0.5 rounded-full">{cart.itemCount}</span>
            )}
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="p-2 rounded-lg text-muted hover:text-ink hover:bg-paper transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {cart.lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
              <div className="w-20 h-20 rounded-2xl bg-paper border border-line flex items-center justify-center mb-5">
                <ShoppingBag className="w-9 h-9 text-muted" />
              </div>
              <h3 className="font-heading text-lg font-bold text-ink">Your cart is empty</h3>
              <p className="text-sm text-muted mt-2 max-w-xs leading-relaxed">
                Discover unique artisan goods and indie brands on Haat.
              </p>
              <button
                onClick={() => { setIsDrawerOpen(false); navigate('/search'); }}
                className="mt-6 px-6 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover transition-colors"
              >
                Start Exploring
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {cart.vendors.map((vendorGroup) => (
                <div key={vendorGroup.vendorId} className="border border-line rounded-xl overflow-hidden">
                  {/* Vendor header */}
                  <div className="px-4 py-2.5 bg-paper border-b border-line flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted">
                      Sold by{' '}
                      <span className="text-brand font-bold">{vendorGroup.vendorName}</span>
                    </span>
                    <span className="text-xs font-bold text-ink tabular-nums">
                      {formatINR(vendorGroup.vendorSubtotalPaise)}
                    </span>
                  </div>

                  {/* Line items */}
                  <div className="divide-y divide-line/60">
                    {vendorGroup.lines.map((line) => (
                      <div key={line.productId} className="p-4 flex gap-3">
                        <Link to={`/products/${line.product.slug}`} onClick={() => setIsDrawerOpen(false)}
                          className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border border-line bg-paper">
                          <img src={line.product.imageUrl} alt={line.product.title} className="w-full h-full object-cover" />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to={`/products/${line.product.slug}`} onClick={() => setIsDrawerOpen(false)}
                            className="text-sm font-semibold text-ink hover:text-brand transition-colors line-clamp-1 leading-snug">
                            {line.product.title}
                          </Link>
                          <p className="text-sm font-bold text-brand mt-0.5 tabular-nums">{formatINR(line.product.pricePaise)}</p>
                          <div className="flex items-center justify-between mt-2.5">
                            {/* Qty controls */}
                            <div className="flex items-center gap-1 border border-line rounded-lg overflow-hidden">
                              <button
                                onClick={() => updateItem(line.productId, Math.max(1, line.quantity - 1))}
                                className="p-1.5 hover:bg-paper transition-colors"
                              >
                                <Minus className="w-3 h-3 text-muted" />
                              </button>
                              <span className="w-7 text-center text-sm font-semibold text-ink tabular-nums">{line.quantity}</span>
                              <button
                                onClick={() => updateItem(line.productId, Math.min(line.product.stock, line.quantity + 1))}
                                className="p-1.5 hover:bg-paper transition-colors"
                              >
                                <Plus className="w-3 h-3 text-muted" />
                              </button>
                            </div>
                            <button onClick={() => removeItem(line.productId)}
                              className="p-1.5 text-muted hover:text-danger transition-colors rounded-lg hover:bg-danger-light">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer summary */}
        {cart.lines.length > 0 && (
          <div className="border-t border-line p-5 bg-surface space-y-4">
            {/* Coupon */}
            {cart.appliedCoupon ? (
              <div className="flex items-center justify-between bg-success/8 border border-success/20 px-3.5 py-2.5 rounded-xl">
                <div className="flex items-center gap-2 text-sm font-medium text-success">
                  <Tag className="w-4 h-4" />
                  <span>Coupon <strong>{cart.appliedCoupon.code}</strong> applied</span>
                </div>
                <button onClick={removeCoupon} className="text-xs font-semibold text-danger hover:underline">
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={e => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Coupon code"
                  className="flex-1 h-9 px-3 border border-line rounded-lg text-xs text-ink placeholder:text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 uppercase font-mono"
                />
                <button type="submit" disabled={isApplyingCoupon}
                  className="h-9 px-4 border border-line rounded-lg text-xs font-semibold text-ink hover:bg-paper disabled:opacity-50 transition-colors">
                  Apply
                </button>
              </form>
            )}

            {/* Price breakdown */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal</span>
                <span className="tabular-nums text-ink font-medium">{formatINR(cart.subtotalPaise)}</span>
              </div>
              {cart.discountPaise > 0 && (
                <div className="flex justify-between text-success font-medium">
                  <span>Discount</span>
                  <span className="tabular-nums">−{formatINR(cart.discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted">
                <span>Delivery</span>
                <span className="tabular-nums text-ink font-medium">
                  {cart.shippingPaise === 0 ? <span className="text-success font-semibold">FREE</span> : formatINR(cart.shippingPaise)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-ink text-base pt-2.5 border-t border-line">
                <span>Total</span>
                <span className="tabular-nums text-brand">{formatINR(cart.totalPaise)}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => { setIsDrawerOpen(false); navigate('/cart'); }}
                className="h-11 rounded-xl border border-line text-sm font-semibold text-ink hover:bg-paper transition-colors"
              >
                View Cart
              </button>
              <button
                onClick={() => { setIsDrawerOpen(false); navigate('/checkout'); }}
                className="h-11 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand-hover transition-colors flex items-center justify-center gap-1.5"
              >
                Checkout <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
