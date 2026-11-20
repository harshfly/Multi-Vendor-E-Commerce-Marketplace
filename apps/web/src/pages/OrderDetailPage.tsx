import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Circle, Truck, Package, Download, XCircle, Star, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatINR } from '../lib/money.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { Input } from '../components/ui/Input.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { toast } from 'sonner';

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  // Review Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewProductId, setReviewProductId] = useState('');
  const [reviewProductTitle, setReviewProductTitle] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fetchOrder = () => {
    setIsLoading(true);
    api
      .get(`/orders/${id}`)
      .then(({ data }) => setOrder(data.order))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleDownloadInvoice = async () => {
    try {
      const response = await api.get(`/orders/${id}/invoice`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice-${order?.number || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {
      toast.error('Failed to download invoice');
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order? Stock will be restored and any payment refunded.')) {
      return;
    }
    setIsCancelling(true);
    try {
      await api.post(`/orders/${id}/cancel`);
      toast.success('Order cancelled and refund initiated');
      fetchOrder();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  const openReviewModal = (productId: string, title: string) => {
    setReviewProductId(productId);
    setReviewProductTitle(title);
    setReviewRating(5);
    setReviewTitle('');
    setReviewBody('');
    setReviewModalOpen(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReview(true);
    try {
      await api.post('/reviews', {
        productId: reviewProductId,
        rating: reviewRating,
        title: reviewTitle,
        body: reviewBody,
      });
      toast.success('Thank you! Your verified review has been posted.');
      setReviewModalOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-card" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h2 className="font-heading text-xl font-bold text-ink">Order Not Found</h2>
        <Link to="/orders">
          <Button className="mt-4" size="sm">Back to My Orders</Button>
        </Link>
      </div>
    );
  }

  const anyShipped = order.vendorOrders.some((vo: any) =>
    ['SHIPPED', 'DELIVERED'].includes(vo.status)
  );
  const canCancel = !anyShipped && !['CANCELLED', 'REFUNDED'].includes(order.status);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <Link to="/orders" className="p-1 rounded-input hover:bg-paper text-ink/70">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-heading text-2xl font-bold text-ink">Order {order.number}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                order.status === 'PAID' ? 'bg-success-light text-success' : 'bg-paper text-ink/70'
              }`}>
                {order.status}
              </span>
            </div>
            <p className="text-xs text-ink/50 mt-0.5">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleDownloadInvoice} variant="outline" size="sm" className="flex items-center gap-1.5">
            <Download className="w-4 h-4 text-brand" />
            <span>Invoice PDF</span>
          </Button>

          {canCancel && (
            <Button
              onClick={handleCancelOrder}
              variant="danger"
              size="sm"
              isLoading={isCancelling}
              className="flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel Order</span>
            </Button>
          )}
        </div>
      </div>

      {/* Per-Vendor Shipment Cards with Vertical Timelines */}
      <div className="space-y-6">
        <h2 className="font-heading font-bold text-lg text-ink">Vendor Shipments & Tracking</h2>

        {order.vendorOrders.map((vo: any) => {
          const isDelivered = vo.status === 'DELIVERED';

          return (
            <div key={vo.id} className="bg-surface border border-line rounded-card p-6 space-y-6 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-line">
                <div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-brand" />
                    <h3 className="font-heading font-bold text-sm text-ink">
                      Shipment from {vo.vendor?.storeName}
                    </h3>
                  </div>
                  {vo.trackingNumber && (
                    <p className="text-xs text-ink/60 mt-1">
                      Tracking: <code className="bg-paper px-2 py-0.5 rounded font-mono font-bold text-ink">{vo.trackingNumber}</code>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold bg-brand-light text-brand px-2.5 py-1 rounded-full">
                    Current: {vo.status}
                  </span>
                  <span className="text-xs font-bold tabular-nums text-ink">
                    {formatINR(vo.subtotalPaise - vo.discountPaise)}
                  </span>
                </div>
              </div>

              {/* Items in this shipment */}
              <div className="space-y-3">
                {vo.items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 p-3 bg-paper/40 rounded-card border border-line/60">
                    <div className="flex items-center gap-3">
                      {item.imageSnapshot && (
                        <img src={item.imageSnapshot} alt="" className="w-12 h-12 object-cover rounded border border-line" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-ink">{item.titleSnapshot}</p>
                        <p className="text-[11px] text-ink/50">
                          Qty: {item.quantity} • {formatINR(item.unitPricePaise)} each
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold tabular-nums text-ink">
                        {formatINR(item.unitPricePaise * item.quantity)}
                      </span>

                      {/* Verified Review Button if delivered */}
                      {isDelivered && (
                        <Button
                          onClick={() => openReviewModal(item.productId, item.titleSnapshot)}
                          size="sm"
                          variant="outline"
                          className="text-xs flex items-center gap-1 text-saffron-800"
                        >
                          <Star className="w-3 h-3 fill-saffron text-saffron" />
                          <span>Write Review</span>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Vertical Fulfillment Timeline */}
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink/60 mb-3">
                  Shipment Milestones
                </h4>

                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
                  {['PLACED', 'PACKED', 'SHIPPED', 'DELIVERED'].map((step, idx) => {
                    const statusEvent = vo.statusHistory?.find((h: any) => h.status === step);
                    const isReached = !!statusEvent;

                    return (
                      <div key={step} className="relative flex items-start gap-3">
                        <div className={`absolute -left-6 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white ${
                          isReached ? 'bg-brand text-white' : 'bg-line text-ink/30'
                        }`}>
                          {isReached ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-2.5 h-2.5" />}
                        </div>

                        <div>
                          <p className={`text-xs font-bold ${isReached ? 'text-ink' : 'text-ink/40'}`}>
                            {step}
                          </p>
                          {statusEvent ? (
                            <p className="text-[11px] text-ink/50">
                              {new Date(statusEvent.createdAt).toLocaleString('en-IN')} {statusEvent.note && `— ${statusEvent.note}`}
                            </p>
                          ) : (
                            <p className="text-[11px] text-ink/30">Pending</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Leave a Verified Customer Review"
      >
        <form onSubmit={handleReviewSubmit} className="space-y-4">
          <p className="text-xs text-ink/70">
            Reviewing: <strong>{reviewProductTitle}</strong>
          </p>

          <div>
            <label className="block text-xs font-semibold text-ink/70 mb-1.5">Rating (1-5 Stars)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setReviewRating(star)}
                  className="p-1 text-saffron hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-6 h-6 ${star <= reviewRating ? 'fill-saffron text-saffron' : 'text-line'}`}
                  />
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Review Headline (Optional)"
            placeholder="e.g. Beautiful fabric, exactly as described"
            value={reviewTitle}
            onChange={(e) => setReviewTitle(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink/70 mb-1">
              Your Review
            </label>
            <textarea
              rows={4}
              required
              minLength={5}
              placeholder="Tell other shoppers about the quality, durability, and packaging..."
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              className="w-full bg-surface border border-line rounded-input p-3 text-sm text-ink placeholder:text-ink/40 focus:ring-2 focus:ring-brand focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setReviewModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmittingReview}>
              Submit Review
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

