import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, Lock, ArrowRight, Truck } from 'lucide-react';
import { useCart } from '../lib/cart-context.js';
import { useAuth } from '../lib/auth-context.js';
import { formatINR } from '../lib/money.js';
import { api } from '../lib/api.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { toast } from 'sonner';

export const CheckoutPage: React.FC = () => {
  const { cart, refreshCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState({
    fullName: user?.name || 'Rohan Sharma',
    phone: '9876543210',
    line1: '402 Sunshine Apartments, Linking Road',
    line2: 'Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please sign in to proceed with checkout');
      navigate('/auth?redirect=/checkout');
      return;
    }

    if (cart.lines.length === 0) {
      toast.error('Your cart is empty');
      navigate('/cart');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Create order & gateway order via API
      const idempotencyKey = `idem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const { data: checkoutRes } = await api.post(
        '/checkout',
        {
          shippingAddress: address,
          couponCode: cart.appliedCoupon?.code,
        },
        {
          headers: { 'idempotency-key': idempotencyKey },
        }
      );

      const { orderId, orderNumber, gatewayOrderId, amountPaise, keyId } = checkoutRes;

      // 2. Open Razorpay Checkout or Instant Simulation
      const paymentProviderType = import.meta.env.VITE_PAYMENT_PROVIDER || 'fake';

      if (paymentProviderType === 'razorpay' && (window as any).Razorpay) {
        const options = {
          key: keyId,
          amount: amountPaise,
          currency: 'INR',
          name: 'Haat Marketplace',
          description: `Order ${orderNumber}`,
          order_id: gatewayOrderId,
          handler: async function (response: any) {
            try {
              await api.post('/payments/verify', {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              await refreshCart();
              navigate(`/order-confirmation/${orderId}`);
            } catch {
              toast.error('Payment verification failed');
            }
          },
          prefill: {
            name: address.fullName,
            email: user.email,
            contact: address.phone,
          },
          theme: { color: '#0E6B63' },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Fake Provider / Instant Test Simulation Mode
        toast.info('Simulating payment captured with test gateway...');
        await new Promise((r) => setTimeout(r, 800));

        await api.post('/payments/verify', {
          orderId: gatewayOrderId,
          razorpay_order_id: gatewayOrderId,
          razorpay_payment_id: `pay_sim_${Date.now()}`,
          razorpay_signature: 'sim_sig',
        });

        await refreshCart();
        toast.success('Payment authorized and captured!');
        navigate(`/order-confirmation/${orderId}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Checkout failed. Please check stock and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="pb-4 border-b border-line flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-ink flex items-center gap-2">
          <Lock className="w-5 h-5 text-brand" />
          <span>Secure Checkout</span>
        </h1>
        <span className="text-xs text-ink/50">3 Compact Steps</span>
      </div>

      <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Steps 1 & 2 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Shipping Address */}
          <div className="bg-surface border border-line rounded-card p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-line">
              <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">
                1
              </span>
              <h2 className="font-heading font-bold text-base text-ink">Shipping Details</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={address.fullName}
                onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                required
              />
              <Input
                label="Phone Number"
                value={address.phone}
                onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                required
              />
              <div className="sm:col-span-2">
                <Input
                  label="Street Address / Flat / Floor"
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  label="Apartment, Landmark, Suite (Optional)"
                  value={address.line2}
                  onChange={(e) => setAddress({ ...address, line2: e.target.value })}
                />
              </div>
              <Input
                label="City"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                required
              />
              <Input
                label="State"
                value={address.state}
                onChange={(e) => setAddress({ ...address, state: e.target.value })}
                required
              />
              <Input
                label="PIN Code"
                value={address.pincode}
                onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Step 2: Multi-Vendor Shipments Review */}
          <div className="bg-surface border border-line rounded-card p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-line">
              <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="font-heading font-bold text-base text-ink">Review Multi-Vendor Shipments</h2>
            </div>

            <p className="text-xs text-ink/60">
              Your cart items originate from {cart.vendors.length} independent sellers and will ship separately.
            </p>

            <div className="space-y-4">
              {cart.vendors.map((vendorGroup) => (
                <div key={vendorGroup.vendorId} className="border border-line rounded-card p-3.5 bg-paper/40">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-line/60">
                    <span className="text-xs font-bold text-ink">
                      Shipment from {vendorGroup.vendorName}
                    </span>
                    <span className="text-xs font-semibold tabular-nums text-brand">
                      {formatINR(vendorGroup.vendorSubtotalPaise)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {vendorGroup.lines.map((line) => (
                      <div key={line.productId} className="flex items-center justify-between text-xs">
                        <span className="text-ink truncate max-w-sm">
                          {line.quantity} × {line.product.title}
                        </span>
                        <span className="text-ink/70 tabular-nums">
                          {formatINR(line.itemTotalPaise)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Step 3 Payment & Sticky Summary */}
        <div className="space-y-4">
          <div className="bg-surface border border-line rounded-card p-6 space-y-4 shadow-xs sticky top-24">
            <div className="flex items-center gap-2 pb-3 border-b border-line">
              <span className="w-6 h-6 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">
                3
              </span>
              <h2 className="font-heading font-bold text-base text-ink">Payment</h2>
            </div>

            <div className="space-y-2.5 text-xs text-ink/70">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium text-ink">{formatINR(cart.subtotalPaise)}</span>
              </div>
              {cart.discountPaise > 0 && (
                <div className="flex justify-between text-danger font-medium">
                  <span>Coupon ({cart.appliedCoupon?.code})</span>
                  <span className="tabular-nums">- {formatINR(cart.discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="tabular-nums font-medium text-ink">
                  {cart.shippingPaise === 0 ? 'FREE' : formatINR(cart.shippingPaise)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-ink pt-3 border-t border-line">
                <span>Total Due</span>
                <span className="tabular-nums text-brand">{formatINR(cart.totalPaise)}</span>
              </div>
            </div>

            <div className="p-3 bg-paper border border-line rounded-input text-xs space-y-1">
              <p className="font-semibold text-ink flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand" />
                <span>Automated Split Settlement</span>
              </p>
              <p className="text-[11px] text-ink/50">
                Single payment automatically distributes net payouts to each vendor minus commission.
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              isLoading={isProcessing}
              className="w-full font-bold text-sm"
            >
              Pay {formatINR(cart.totalPaise)}
            </Button>

            <div className="pt-2 text-[11px] text-ink/50 flex items-center justify-center gap-1.5 text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-brand" />
              <span>256-Bit SSL Encryption • Razorpay Route Escrow</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

