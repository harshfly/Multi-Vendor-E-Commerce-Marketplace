import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Sparkles, Star, TrendingUp, Package, Shield, ChevronRight, Play } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatINR } from '../lib/money.js';
import { useCart } from '../lib/cart-context.js';
import { Rating } from '../components/ui/Rating.js';
import { Skeleton } from '../components/ui/Skeleton.js';

/* ─── Product card ─── */
const ProductCard: React.FC<{ product: any }> = ({ product }) => {
  const { addItem } = useCart();
  const discount = product.mrpPaise
    ? Math.round(((product.mrpPaise - product.pricePaise) / product.mrpPaise) * 100)
    : 0;

  return (
    <div className="product-card group overflow-hidden flex flex-col">
      <Link to={`/products/${product.slug}`} className="relative block overflow-hidden bg-paper aspect-[4/3]">
        <img
          src={product.imageUrl}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {discount > 0 && (
          <span className="absolute top-2.5 left-2.5 bg-success text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            {discount}% OFF
          </span>
        )}
        {product.stock <= 5 && product.stock > 0 && (
          <span className="absolute bottom-2.5 left-2.5 bg-danger/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
            Only {product.stock} left
          </span>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </Link>

      <div className="p-4 flex-1 flex flex-col gap-2.5">
        <div>
          <p className="text-xs font-semibold text-brand mb-1 truncate">{product.vendorName}</p>
          <Link
            to={`/products/${product.slug}`}
            className="font-semibold text-sm text-ink hover:text-brand transition-colors line-clamp-2 leading-snug"
          >
            {product.title}
          </Link>
        </div>

        <div className="mt-auto space-y-2.5">
          <Rating rating={product.ratingAvg} count={product.ratingCount} />
          <div className="flex items-baseline gap-2">
            <span className="font-heading font-bold text-base text-ink tabular-nums">{formatINR(product.pricePaise)}</span>
            {product.mrpPaise && product.mrpPaise !== product.pricePaise && (
              <span className="text-xs text-muted line-through tabular-nums">{formatINR(product.mrpPaise)}</span>
            )}
          </div>
          <button
            onClick={() => addItem(product.id, 1)}
            className="w-full h-9 rounded-lg bg-brand-subtle border border-brand/20 text-brand text-xs font-semibold hover:bg-brand hover:text-white hover:border-brand transition-all duration-200 focus-ring"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

const ProductSkeleton = () => (
  <div className="bg-surface border border-line rounded-card overflow-hidden">
    <div className="shimmer aspect-[4/3] w-full" />
    <div className="p-4 space-y-2.5">
      <div className="shimmer h-3 w-1/2 rounded-full" />
      <div className="shimmer h-4 w-5/6 rounded-full" />
      <div className="shimmer h-3 w-3/4 rounded-full" />
      <div className="shimmer h-5 w-1/3 rounded-full" />
      <div className="shimmer h-9 w-full rounded-lg" />
    </div>
  </div>
);

/* ─── Category card ─── */
const CATEGORIES = [
  { name: 'Handloom Sarees', slug: 'sarees', emoji: '🧵', desc: 'Chanderi, Banarasi & Block Print', image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop&q=80', color: 'from-rose-500/60' },
  { name: 'Electronics & Audio', slug: 'electronics', emoji: '🎧', desc: 'Headphones, DACs & Keyboards', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80', color: 'from-blue-600/60' },
  { name: 'Pottery & Ceramics', slug: 'ceramics', emoji: '🏺', desc: 'Handthrown stoneware & copperware', image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&auto=format&fit=crop&q=80', color: 'from-orange-600/60' },
  { name: 'Artisan Crafts', slug: 'artisan-crafts', emoji: '🪵', desc: 'Woodwork, journals & leathergoods', image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80', color: 'from-emerald-700/60' },
];

/* ─── Stats ─── */
const STATS = [
  { value: '50+', label: 'Verified Sellers' },
  { value: '1K+', label: 'Artisan Products' },
  { value: '99%', label: 'Customer Satisfaction' },
  { value: '₹0', label: 'Buyer Fees' },
];

export const HomePage: React.FC = () => {
  const [heroSearch, setHeroSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/products?limit=8').then(r => {
      setProducts(r.data.items || []);
    }).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) navigate(`/search?q=${encodeURIComponent(heroSearch.trim())}`);
  };

  return (
    <div className="min-h-screen">

      {/* ═══ HERO ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-ink via-slate-800 to-brand-ink">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1600&auto=format&fit=crop&q=40')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/70 to-transparent" />

        <div className="relative section-container py-20 md:py-28 lg:py-36">
          <div className="max-w-2xl">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-white/90 mb-6 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber" />
              Direct-from-Maker Commerce · India
            </div>

            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight text-balance">
              Discover India's finest
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber to-orange-300"> artisans</span>
              <br />& makers
            </h1>
            <p className="mt-5 text-base sm:text-lg text-white/60 max-w-xl leading-relaxed">
              Shop handloom textiles, studio audio gear, handcrafted ceramics, and more — directly from verified independent sellers.
            </p>

            {/* Hero search */}
            <form onSubmit={handleSearch} className="mt-8 flex gap-2 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
                <input
                  value={heroSearch}
                  onChange={e => setHeroSearch(e.target.value)}
                  type="text"
                  placeholder="Sarees, headphones, ceramics…"
                  className="w-full h-14 pl-12 pr-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all text-base"
                />
              </div>
              <button
                type="submit"
                className="h-14 px-6 bg-brand hover:bg-brand-hover text-white font-semibold rounded-xl transition-colors shadow-lg whitespace-nowrap"
              >
                Search
              </button>
            </form>

            {/* Quick chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {['Chanderi Silk', 'Studio Headphones', 'Handmade Pottery', 'Mechanical Keyboards'].map(chip => (
                <button
                  key={chip}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(chip)}`)}
                  className="text-xs text-white/60 hover:text-white bg-white/8 hover:bg-white/15 border border-white/15 px-3 py-1.5 rounded-full transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative border-t border-white/10 backdrop-blur-sm bg-white/5">
          <div className="section-container py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="font-heading text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-white/50 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CATEGORIES ═══ */}
      <section className="section-container py-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand mb-1">Collections</p>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ink">Shop by Category</h2>
          </div>
          <Link to="/search" className="hidden sm:flex items-center gap-1 text-sm font-semibold text-muted hover:text-brand transition-colors">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORIES.map(cat => (
            <Link
              key={cat.slug}
              to={`/search?category=${cat.slug}`}
              className="group relative overflow-hidden rounded-xl aspect-[3/4] block"
            >
              <img
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className={`absolute inset-0 bg-gradient-to-t ${cat.color} to-transparent`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <span className="text-2xl mb-1 block">{cat.emoji}</span>
                <h3 className="font-heading font-bold text-sm sm:text-base text-white leading-snug">{cat.name}</h3>
                <p className="text-xs text-white/70 mt-0.5 hidden sm:block">{cat.desc}</p>
                <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-white/80 group-hover:text-white transition-colors">
                  Explore <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ TRENDING PRODUCTS ═══ */}
      <section className="bg-paper py-16">
        <div className="section-container">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand mb-1">Catalog</p>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ink">Fresh From Makers</h2>
            </div>
            <Link to="/search" className="hidden sm:flex items-center gap-1 text-sm font-semibold text-muted hover:text-brand transition-colors">
              Browse all ({products.length}) <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
              : products.map(p => <ProductCard key={p.id} product={p} />)
            }
          </div>

          <div className="mt-10 text-center">
            <Link
              to="/search"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-ink text-white font-semibold rounded-xl hover:bg-slate-700 transition-colors"
            >
              View All Products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="section-container py-16">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-brand mb-2">The Haat Way</p>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-ink">How it works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '01', icon: Search, title: 'Discover', desc: 'Browse products from verified Indian artisans and specialized sellers across dozens of categories.' },
            { step: '02', icon: Package, title: 'Order', desc: 'Add items from multiple vendors in one cart. We handle split payment and routing automatically.' },
            { step: '03', icon: Shield, title: 'Receive', desc: 'Sellers ship directly to you with live tracking. Automatic refunds if anything goes wrong.' },
          ].map(({ step, icon: Icon, title, desc }) => (
            <div key={step} className="relative text-center p-8 rounded-2xl bg-surface border border-line">
              <div className="absolute top-4 right-4 font-mono text-5xl font-bold text-line select-none">{step}</div>
              <div className="w-14 h-14 rounded-2xl bg-brand-subtle border border-brand/20 flex items-center justify-center mx-auto mb-5">
                <Icon className="w-6 h-6 text-brand" />
              </div>
              <h3 className="font-heading text-lg font-bold text-ink mb-2">{title}</h3>
              <p className="text-sm text-muted leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ VENDOR CTA ═══ */}
      <section className="section-container pb-16">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-ink to-brand p-8 sm:p-12">
          <div className="absolute right-0 top-0 w-1/2 h-full opacity-10">
            <div className="absolute right-8 top-8 w-40 h-40 bg-white rounded-full blur-3xl" />
            <div className="absolute right-32 bottom-8 w-32 h-32 bg-amber rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-xl">
            <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider bg-white/15 text-white rounded-full mb-4">
              For Sellers
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white leading-tight">
              Sell your craft to <br/>all of India
            </h2>
            <p className="mt-4 text-white/70 text-base leading-relaxed">
              Join Haat's growing network of verified sellers. Keep full control of your pricing, enjoy transparent 8–12% commission, and get paid automatically.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/vendor/apply"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-brand font-bold rounded-xl hover:bg-white/90 transition-colors shadow-lg"
              >
                Apply to Sell <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors border border-white/20"
              >
                Seller Login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
