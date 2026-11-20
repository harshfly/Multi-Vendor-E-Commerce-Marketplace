import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Download, Package, ArrowRight, Truck } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatINR } from '../lib/money.js';
import { Button } from '../components/ui/Button.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { toast } from 'sonner';

export const OrderConfirmationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/orders/${id}`)
      .then(({ data }) => setOrder(data.order))
      .catch((err) => {
        console.error('Failed to load order', err);
        toast.error('Could not load order details');
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleDownloadInvoice = async () => {
    try {
      const response = await api.get(`/orders/${id}/invoice`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${order?.number || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {
      toast.error('Failed to download invoice PDF');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-4">
        <Skeleton className="h-16 w-16 rounded-full mx-auto" />
        <Skeleton className="h-8 w-1/2 mx-auto" />
        <Skeleton className="h-48 w-full rounded-card" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h2 className="font-heading text-xl font-bold text-ink">Order Not Found</h2>
        <Link to="/orders" className="text-brand text-xs font-semibold hover:underline mt-2 inline-block">
          View My Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Success Banner */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-full bg-success-light text-success flex items-center justify-center mx-auto mb-2">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-ink">Order Confirmed!</h1>
        <p className="text-sm text-ink/60">
          Thank you for shopping on Haat. Your order <strong>{order.number}</strong> has been placed and payment captured.
        </p>
      </div>

      {/* Invoice Download Action */}
      <div className="bg-surface border border-line rounded-card p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div>
          <p className="text-xs font-bold text-ink">Tax Invoice Ready</p>
          <p className="text-[11px] text-ink/50">Itemized PDF receipt with GST breakdown and vendor seller details.</p>
        </div>
        <Button onClick={handleDownloadInvoice} variant="outline" size="sm" className="flex items-center gap-2">
          <Download className="w-4 h-4 text-brand" />
          <span>Download Invoice (PDF)</span>
        </Button>
      </div>

      {/* Shipments Breakdown */}
      <div className="space-y-4">
        <h2 className="font-heading font-bold text-base text-ink">Independent Vendor Shipments</h2>

        {order.vendorOrders.map((vo: any) => (
          <div key={vo.id} className="bg-surface border border-line rounded-card p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand" />
                <span className="text-xs font-bold text-ink">
                  Package from {vo.vendor?.storeName}
                </span>
                <span className="text-[10px] font-semibold bg-brand-light text-brand px-2 py-0.5 rounded">
                  Status: {vo.status}
                </span>
              </div>
              <span className="text-xs font-bold tabular-nums text-ink">
                {formatINR(vo.subtotalPaise - vo.discountPaise)}
              </span>
            </div>

            <div className="space-y-2">
              {vo.items.map((it: any) => (
                <div key={it.id} className="flex items-center justify-between text-xs">
                  <span className="text-ink truncate max-w-md">
                    {it.quantity} × {it.titleSnapshot}
                  </span>
                  <span className="tabular-nums text-ink/70">
                    {formatINR(it.unitPricePaise * it.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Action Footer */}
      <div className="flex justify-center gap-4 pt-4">
        <Link to="/orders">
          <Button variant="secondary" size="md">
            View All Orders
          </Button>
        </Link>
        <Link to={`/orders/${order.id}`}>
          <Button size="md" className="flex items-center gap-1.5">
            <span>Track Delivery Timeline</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
};

