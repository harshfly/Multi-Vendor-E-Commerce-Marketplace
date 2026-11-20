import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ArrowRight, Truck } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatINR } from '../lib/money.js';
import { Button } from '../components/ui/Button.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { EmptyState } from '../components/ui/EmptyState.js';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get('/orders')
      .then(({ data }) => setOrders(data.orders || []))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full rounded-card" />
        <Skeleton className="h-32 w-full rounded-card" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          icon={Package}
          title="No Orders Placed Yet"
          description="When you order from our verified makers and vendors, you'll find independent shipment tracking right here."
          actionLabel="Start Shopping"
          onAction={() => window.location.href = '/search'}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="pb-4 border-b border-line flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-ink">My Orders</h1>
          <p className="text-xs text-ink/50 mt-0.5">
            {orders.length} {orders.length === 1 ? 'order' : 'orders'} placed
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-surface border border-line rounded-card overflow-hidden shadow-xs hover:border-brand/40 transition-all"
          >
            {/* Order Header */}
            <div className="bg-paper px-5 py-3 border-b border-line flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-ink/50 block text-[10px] uppercase">Order Placed</span>
                  <span className="font-semibold text-ink">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-ink/50 block text-[10px] uppercase">Total</span>
                  <span className="font-bold text-ink tabular-nums">{formatINR(order.totalPaise)}</span>
                </div>
                <div>
                  <span className="text-ink/50 block text-[10px] uppercase">Order #</span>
                  <span className="font-mono font-semibold text-ink">{order.number}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  order.status === 'PAID' ? 'bg-success-light text-success' : 'bg-paper text-ink/70'
                }`}>
                  {order.status}
                </span>
                <Link to={`/orders/${order.id}`}>
                  <Button variant="outline" size="sm" className="text-xs">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>

            {/* Vendor Orders preview */}
            <div className="p-5 space-y-4">
              {order.vendorOrders.map((vo: any) => (
                <div key={vo.id} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Truck className="w-4 h-4 text-brand flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-ink">
                        Sold by {vo.vendor?.storeName}
                      </p>
                      <p className="text-[11px] text-ink/50">
                        {vo.items.length} {vo.items.length === 1 ? 'item' : 'items'} • Status:{' '}
                        <span className="font-semibold text-brand">{vo.status}</span>
                      </p>
                    </div>
                  </div>

                  <Link to={`/orders/${order.id}`}>
                    <span className="text-xs font-semibold text-brand hover:underline flex items-center gap-1">
                      <span>Timeline</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

