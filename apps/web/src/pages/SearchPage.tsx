import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronDown, X, Star, Grid3X3, List } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatINR } from '../lib/money.js';
import { useCart } from '../lib/cart-context.js';
import { Rating } from '../components/ui/Rating.js';

const ProductCard: React.FC<{ p: any; view: 'grid' | 'list' }> = ({ p, view }) => {
  const { addItem } = useCart();
  const discount = p.mrpPaise ? Math.round(((p.mrpPaise - p.pricePaise) / p.mrpPaise) * 100) : 0;

  if (view === 'list') {
    return (
      <div className="bg-surface border border-line rounded-card flex gap-4 p-4 hover:shadow-card-hover hover:border-lineHover transition-all group">
        <Link to={`/products/${p.slug}`} className="w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden bg-paper">
          <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </Link>
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-brand mb-0.5">{p.vendorName}</p>
            <Link to={`/products/${p.slug}`} className="font-semibold text-sm text-ink hover:text-brand transition-colors line-clamp-2">{p.title}</Link>
            <div className="mt-1.5"><Rating rating={p.ratingAvg} count={p.ratingCount} /></div>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-bold text-base text-ink">{formatINR(p.pricePaise)}</span>
              {p.mrpPaise && <span className="text-xs text-muted line-through">{formatINR(p.mrpPaise)}</span>}
              {discount > 0 && <span className="text-xs font-bold text-success">{discount}% off</span>}
            </div>
            <button onClick={() => addItem(p.id, 1)}
              className="ml-auto px-4 py-1.5 text-xs font-semibold text-brand border border-brand/30 rounded-lg hover:bg-brand hover:text-white transition-all">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="product-card group overflow-hidden flex flex-col">
      <Link to={`/products/${p.slug}`} className="relative block overflow-hidden bg-paper aspect-square">
        <img src={p.imageUrl} alt={p.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        {discount > 0 && (
          <span className="absolute top-2.5 left-2.5 bg-success text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{discount}% OFF</span>
        )}
      </Link>
      <div className="p-4 flex-1 flex flex-col gap-2.5">
        <div>
          <p className="text-xs font-semibold text-brand mb-0.5 truncate">{p.vendorName}</p>
          <Link to={`/products/${p.slug}`} className="font-semibold text-sm text-ink hover:text-brand transition-colors line-clamp-2 leading-snug">{p.title}</Link>
        </div>
        <div className="mt-auto space-y-2">
          <Rating rating={p.ratingAvg} count={p.ratingCount} />
          <div className="flex items-baseline gap-2">
            <span className="font-heading font-bold text-base text-ink">{formatINR(p.pricePaise)}</span>
            {p.mrpPaise && p.mrpPaise !== p.pricePaise && <span className="text-xs text-muted line-through">{formatINR(p.mrpPaise)}</span>}
          </div>
          <button onClick={() => addItem(p.id, 1)}
            className="w-full h-9 rounded-lg text-xs font-semibold text-brand border border-brand/20 bg-brand-subtle hover:bg-brand hover:text-white transition-all">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

const Skeleton = ({ className = '' }: { className?: string }) => (
  <div className={`shimmer rounded ${className}`} />
);

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<any[]>([]);
  const [facets, setFacets] = useState<any>({});
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [localQ, setLocalQ] = useState(searchParams.get('q') || '');

  const q        = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const vendor   = searchParams.get('vendor') || '';
  const sort     = searchParams.get('sort') || 'createdAt_desc';
  const page     = Number(searchParams.get('page') || 1);

  const updateParam = (key: string, value: string) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    p.delete('page');
    setSearchParams(p);
  };

  useEffect(() => {
    setLocalQ(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (q)        params.set('q', q);
    if (category) params.set('category', category);
    if (vendor)   params.set('vendor', vendor);
    params.set('sort',  sort);
    params.set('page',  String(page));
    params.set('limit', '12');

    api.get(`/products?${params}`).then(r => {
      setResults(r.data.items || []);
      setFacets(r.data.facets || {});
      setTotal(r.data.total || 0);
    }).catch(console.error).finally(() => setIsLoading(false));
  }, [q, category, vendor, sort, page]);

  const SORTS = [
    { value: 'createdAt_desc', label: 'Newest First' },
    { value: 'price_asc',      label: 'Price: Low to High' },
    { value: 'price_desc',     label: 'Price: High to Low' },
    { value: 'rating_desc',    label: 'Top Rated' },
  ];

  const activeCats = (facets.categories || []).filter((c: any) => c.doc_count > 0);
  const activeVend = (facets.vendors   || []).filter((v: any) => v.doc_count > 0);

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Categories */}
      {activeCats.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-3">Category</h3>
          <div className="space-y-1">
            <button onClick={() => updateParam('category', '')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!category ? 'bg-brand-subtle text-brand font-semibold' : 'text-muted hover:text-ink hover:bg-paper'}`}>
              All Categories
            </button>
            {activeCats.map((c: any) => (
              <button key={c.key} onClick={() => updateParam('category', c.key)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${category === c.key ? 'bg-brand-subtle text-brand font-semibold' : 'text-muted hover:text-ink hover:bg-paper'}`}>
                <span>{c.label}</span>
                <span className="text-xs bg-line text-muted px-1.5 rounded-full">{c.doc_count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vendors */}
      {activeVend.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-3">Seller</h3>
          <div className="space-y-1">
            <button onClick={() => updateParam('vendor', '')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!vendor ? 'bg-brand-subtle text-brand font-semibold' : 'text-muted hover:text-ink hover:bg-paper'}`}>
              All Sellers
            </button>
            {activeVend.map((v: any) => (
              <button key={v.key} onClick={() => updateParam('vendor', v.key)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${vendor === v.key ? 'bg-brand-subtle text-brand font-semibold' : 'text-muted hover:text-ink hover:bg-paper'}`}>
                <span className="truncate">{v.label}</span>
                <span className="text-xs bg-line text-muted px-1.5 rounded-full">{v.doc_count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="section-container py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading text-xl font-bold text-ink">
          {q ? `Results for "${q}"` : category ? 'Browse Category' : 'All Products'}
        </h1>
        {!isLoading && <p className="text-sm text-muted mt-0.5">{total} products found</p>}
      </div>

      {/* Mobile search + filter bar */}
      <div className="flex gap-2 mb-6 md:hidden">
        <form className="flex-1 relative" onSubmit={e => { e.preventDefault(); updateParam('q', localQ); }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input value={localQ} onChange={e => setLocalQ(e.target.value)}
            className="w-full h-10 pl-9 pr-3 bg-surface border border-line rounded-input text-sm focus:outline-none focus:border-brand" placeholder="Search…" />
        </form>
        <button onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 h-10 px-3 border border-line rounded-input text-sm text-ink bg-surface">
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>
      </div>

      {/* Mobile filter panel */}
      {showFilters && (
        <div className="md:hidden mb-6 p-4 bg-surface border border-line rounded-card animate-fade-in">
          <FilterPanel />
        </div>
      )}

      <div className="flex gap-8">
        {/* Sidebar filters */}
        <aside className="hidden md:block w-56 flex-shrink-0">
          <div className="sticky top-24">
            <FilterPanel />
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-line">
            <div className="flex items-center gap-2 flex-wrap">
              {(q || category || vendor) && (
                <span className="text-xs text-muted">Active filters:</span>
              )}
              {q && <span className="pill bg-brand-subtle text-brand border border-brand/20">"{q}" <button onClick={() => updateParam('q', '')} className="ml-1"><X className="w-3 h-3" /></button></span>}
              {category && <span className="pill bg-brand-subtle text-brand border border-brand/20">{category} <button onClick={() => updateParam('category', '')} className="ml-1"><X className="w-3 h-3" /></button></span>}
              {vendor && <span className="pill bg-brand-subtle text-brand border border-brand/20">seller <button onClick={() => updateParam('vendor', '')} className="ml-1"><X className="w-3 h-3" /></button></span>}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <select value={sort} onChange={e => updateParam('sort', e.target.value)}
                className="h-8 px-2 text-xs border border-line rounded-lg bg-surface text-ink focus:outline-none focus:border-brand">
                {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <div className="flex border border-line rounded-lg overflow-hidden">
                <button onClick={() => setView('grid')} className={`p-2 transition-colors ${view === 'grid' ? 'bg-brand text-white' : 'bg-surface text-muted hover:text-ink'}`}><Grid3X3 className="w-4 h-4" /></button>
                <button onClick={() => setView('list')} className={`p-2 transition-colors ${view === 'list' ? 'bg-brand text-white' : 'bg-surface text-muted hover:text-ink'}`}><List className="w-4 h-4" /></button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className={view === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 gap-5' : 'space-y-4'}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={view === 'grid' ? 'rounded-card overflow-hidden border border-line' : 'flex gap-4 p-4 border border-line rounded-card'}>
                  <div className={`shimmer ${view === 'grid' ? 'aspect-square w-full' : 'w-28 h-28 rounded-lg flex-shrink-0'}`} />
                  {view === 'grid' && <div className="p-4 space-y-2"><div className="shimmer h-3 w-3/4 rounded" /><div className="shimmer h-4 w-5/6 rounded" /><div className="shimmer h-8 w-full rounded-lg" /></div>}
                  {view === 'list' && <div className="flex-1 space-y-2 py-1"><div className="shimmer h-3 w-1/4 rounded" /><div className="shimmer h-4 w-3/4 rounded" /><div className="shimmer h-5 w-1/3 rounded" /></div>}
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-paper border border-line flex items-center justify-center mx-auto mb-4">
                <Search className="w-7 h-7 text-muted" />
              </div>
              <h3 className="font-heading text-lg font-bold text-ink">No products found</h3>
              <p className="text-sm text-muted mt-1">Try adjusting your search or filters</p>
              <button onClick={() => setSearchParams(new URLSearchParams())}
                className="mt-5 px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover transition-colors">
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <div className={view === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-3 gap-5'
                : 'space-y-4'}>
                {results.map(p => <ProductCard key={p.id} p={p} view={view} />)}
              </div>

              {/* Pagination */}
              {total > 12 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button disabled={page <= 1} onClick={() => updateParam('page', String(page - 1))}
                    className="px-4 py-2 text-sm font-medium border border-line rounded-lg disabled:opacity-40 hover:bg-paper transition-colors">
                    Previous
                  </button>
                  <span className="text-sm text-muted px-4">Page {page} of {Math.ceil(total / 12)}</span>
                  <button disabled={page >= Math.ceil(total / 12)} onClick={() => updateParam('page', String(page + 1))}
                    className="px-4 py-2 text-sm font-medium border border-line rounded-lg disabled:opacity-40 hover:bg-paper transition-colors">
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
