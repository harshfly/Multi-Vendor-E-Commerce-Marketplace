import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, Store, Heart, Share2, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatINR } from '../lib/money.js';
import { useCart } from '../lib/cart-context.js';
import { Rating } from '../components/ui/Rating.js';
import { Button } from '../components/ui/Button.js';
import { QtyStepper } from '../components/ui/QtyStepper.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { toast } from 'sonner';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [reviewsData, setReviewsData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    api
      .get(`/products/${slug}`)
      .then(async ({ data }) => {
        const p = data.product;
        setProduct(p);
        setSelectedImage(p.images?.[0]?.url || '');
        // Load reviews
        try {
          const revRes = await api.get(`/reviews/${p.id}/reviews`);
          setReviewsData(revRes.data);
        } catch {}
      })
      .catch((err) => {
        console.error('Failed to load product', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [slug]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-2 gap-10">
        <Skeleton className="h-[450px] w-full rounded-card" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="font-heading text-xl font-bold text-ink">Product Not Found</h2>
        <p className="text-xs text-ink/60 mt-1">The requested product could not be located or has been archived.</p>
        <Link to="/search">
          <Button className="mt-4" size="sm">Back to Marketplace</Button>
        </Link>
      </div>
    );
  }

  const discount = product.mrpPaise
    ? Math.round(((product.mrpPaise - product.pricePaise) / product.mrpPaise) * 100)
    : 0;

  const handleBuyNow = async () => {
    await addItem(product.id, quantity);
    navigate('/checkout');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Breadcrumb */}
      <nav className="text-xs text-ink/50 flex items-center gap-1.5">
        <Link to="/" className="hover:text-ink">Home</Link>
        <span>/</span>
        <Link to={`/search?category=${product.category?.slug}`} className="hover:text-ink">
          {product.category?.name}
        </Link>
        <span>/</span>
        <span className="text-ink font-medium truncate max-w-xs">{product.title}</span>
      </nav>

      {/* Main Product Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-square bg-paper rounded-card border border-line overflow-hidden flex items-center justify-center">
            <img
              src={selectedImage || product.images?.[0]?.url}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img.url)}
                  className={`w-16 h-16 rounded border overflow-hidden flex-shrink-0 transition-all ${
                    selectedImage === img.url ? 'border-brand ring-2 ring-brand/30' : 'border-line opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Details & Actions */}
        <div className="space-y-5">
          {/* Vendor Link */}
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-brand" />
            <Link
              to={`/vendors/${product.vendor?.slug}`}
              className="text-xs font-bold text-brand hover:underline"
            >
              Sold by {product.vendor?.storeName}
            </Link>
            <span className="text-line">•</span>
            <span className="text-[11px] text-ink/50 bg-paper px-2 py-0.5 rounded border border-line">
              Verified Merchant
            </span>
          </div>

          {/* Title */}
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-ink leading-tight">
            {product.title}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-3">
            <Rating rating={product.ratingAvg} count={product.ratingCount} size="md" />
            <span className="text-line">|</span>
            <span className="text-xs text-ink/60">
              {product.ratingCount} customer {product.ratingCount === 1 ? 'review' : 'reviews'}
            </span>
          </div>

          {/* Price Box */}
          <div className="p-4 bg-paper/60 border border-line rounded-card flex items-baseline gap-3">
            <span className="font-heading text-3xl font-bold text-ink tabular-nums">
              {formatINR(product.pricePaise)}
            </span>
            {product.mrpPaise && (
              <span className="text-sm text-ink/40 line-through tabular-nums">
                {formatINR(product.mrpPaise)}
              </span>
            )}
            {discount > 0 && (
              <span className="bg-saffron text-ink text-xs font-bold px-2 py-0.5 rounded">
                Save {discount}%
              </span>
            )}
          </div>

          {/* Stock state */}
          <div>
            {product.stock > 0 ? (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
                <span className="text-xs font-semibold text-success">In Stock</span>
                {product.stock <= 5 && (
                  <span className="text-xs text-danger font-medium">
                    (Only {product.stock} units left — order soon)
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-danger"></span>
                <span className="text-xs font-semibold text-danger">Currently Out of Stock</span>
              </div>
            )}
          </div>

          {/* Actions: Qty + Buttons */}
          {product.stock > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink/70">Quantity:</span>
                <QtyStepper
                  value={quantity}
                  max={product.stock}
                  onChange={(q) => setQuantity(q)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => addItem(product.id, quantity)}
                  size="lg"
                  className="flex-1 font-bold text-sm"
                >
                  Add to Cart
                </Button>
                <Button
                  onClick={handleBuyNow}
                  size="lg"
                  variant="secondary"
                  className="flex-1 font-bold text-sm bg-line hover:bg-ink hover:text-white transition-colors"
                >
                  Buy Now
                </Button>
              </div>
            </div>
          )}

          {/* Delivery & Trust Perks */}
          <div className="border-t border-line pt-5 space-y-2.5 text-xs text-ink/70">
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-brand" />
              <span>Free standard delivery on orders above ₹1,000</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-brand" />
              <span>Direct dispatch from {product.vendor?.storeName} with tracking</span>
            </div>
            <div className="flex items-center gap-2.5">
              <RotateCcw className="w-4 h-4 text-brand" />
              <span>Easy cancellation & full refund before seller ships</span>
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-line pt-5 space-y-2">
            <h3 className="font-heading font-bold text-sm text-ink">Product Overview</h3>
            <p className="text-xs sm:text-sm text-ink/80 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <section className="border-t border-line pt-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-xl font-bold text-ink">Customer Reviews</h2>
            <p className="text-xs text-ink/50">Verified purchasers who received this product</p>
          </div>
        </div>

        {reviewsData?.reviews?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Rating Breakdown */}
            <div className="bg-surface border border-line rounded-card p-5 space-y-3 h-fit">
              <div className="text-center pb-3 border-b border-line">
                <span className="font-heading text-4xl font-bold text-ink">{product.ratingAvg.toFixed(1)}</span>
                <p className="text-xs text-ink/50 mt-1">out of 5 stars ({product.ratingCount} ratings)</p>
                <Rating rating={product.ratingAvg} className="justify-center mt-2" size="md" />
              </div>

              {/* Star Distribution */}
              <div className="space-y-1.5 text-xs">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = reviewsData.distribution?.[stars] || 0;
                  const pct = product.ratingCount > 0 ? Math.round((count / product.ratingCount) * 100) : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2">
                      <span className="w-10 text-ink/60">{stars} star</span>
                      <div className="flex-1 h-2 bg-paper rounded-full overflow-hidden">
                        <div className="h-full bg-saffron rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-ink/40 tabular-nums">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reviews List */}
            <div className="md:col-span-2 space-y-4">
              {reviewsData.reviews.map((rev: any) => (
                <div key={rev.id} className="bg-surface border border-line rounded-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Rating rating={rev.rating} />
                      {rev.verifiedPurchase && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success bg-success-light px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified Purchase</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-ink/40">
                      {new Date(rev.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  {rev.title && <h4 className="font-bold text-xs text-ink">{rev.title}</h4>}
                  <p className="text-xs text-ink/70 leading-relaxed">{rev.body}</p>
                  <p className="text-[11px] text-ink/50 font-medium">By {rev.user?.name}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 bg-paper/40 border border-line rounded-card">
            <p className="text-xs text-ink/60">No reviews yet for this product.</p>
            <p className="text-[11px] text-ink/40 mt-1">
              Reviews can be submitted by verified customers once the product has been delivered.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

