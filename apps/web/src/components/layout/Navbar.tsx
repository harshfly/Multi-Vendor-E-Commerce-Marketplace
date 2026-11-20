import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search, ShoppingBag, User, Store, ShieldCheck,
  LogOut, Package, ChevronDown, Menu, X, Sparkles,
  Bell, Heart
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context.js';
import { useCart } from '../../lib/cart-context.js';
import { api } from '../../lib/api.js';
import { formatINR } from '../../lib/money.js';

const NAV_CATEGORIES = [
  { label: 'Textiles', href: '/search?category=sarees' },
  { label: 'Electronics', href: '/search?category=electronics' },
  { label: 'Ceramics', href: '/search?category=ceramics' },
  { label: 'Artisan Crafts', href: '/search?category=artisan-crafts' },
];

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { cart, setIsDrawerOpen } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location]);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      setIsSuggestOpen(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/search/suggest?q=${encodeURIComponent(searchQuery)}`);
        setSuggestions(data.suggestions || []);
        setIsSuggestOpen(true);
      } catch { /* ignore */ }
    }, 220);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSuggestOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSuggestOpen(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const cartCount = cart.itemCount;

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-brand text-white text-xs py-2 text-center font-medium tracking-wide hidden sm:block">
        🇮🇳 &nbsp;India's authentic multi-vendor marketplace &mdash; demo accounts available &nbsp;·&nbsp; Free shipping on orders above ₹999
      </div>

      <header
        className={`sticky top-0 z-40 bg-surface transition-shadow duration-200 ${isScrolled ? 'shadow-nav' : 'border-b border-line'
          }`}
      >
        <div className="section-container">
          <div className="flex items-center gap-3 md:gap-6 h-16">

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-muted hover:text-ink hover:bg-paper transition-colors focus-ring"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
              <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow-btn flex-shrink-0 group-hover:bg-brand-hover transition-colors">
                <span className="text-white font-heading font-bold text-base leading-none select-none">ह</span>
              </div>
              <div className="hidden sm:block">
                <span className="font-heading text-lg font-bold text-ink tracking-tight leading-none">Haat</span>
                <span className="block text-[9px] font-semibold uppercase tracking-widest text-muted leading-none mt-0.5">Marketplace</span>
              </div>
            </Link>

            {/* Search bar */}
            <div ref={searchRef} className="flex-1 relative hidden md:block">
              <form onSubmit={handleSearchSubmit}>
                <div className="relative flex items-center">
                  <Search className="absolute left-3.5 w-4 h-4 text-subtle pointer-events-none z-10" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery.length >= 2 && setIsSuggestOpen(true)}
                    placeholder="Search products, artisans, brands…"
                    className="w-full h-10 pl-10 pr-24 bg-paper border border-line rounded-input text-sm text-ink placeholder:text-subtle focus:outline-none focus:border-brand focus:bg-surface focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 h-7 px-4 bg-brand text-white text-xs font-semibold rounded-md hover:bg-brand-hover transition-colors"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Autocomplete */}
              {isSuggestOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface border border-line rounded-card shadow-modal overflow-hidden z-50 animate-fade-in">
                  <div className="px-3.5 py-2 border-b border-line">
                    <span className="text-2xs font-bold uppercase tracking-widest text-muted">Suggestions</span>
                  </div>
                  <div>
                    {suggestions.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setIsSuggestOpen(false); navigate(`/products/${item.slug}`); }}
                        className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-paper transition-colors text-left"
                      >
                        <img src={item.imageUrl} alt="" className="w-10 h-10 object-cover rounded-lg border border-line flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{item.title}</p>
                          <p className="text-xs text-muted mt-0.5">{item.category}</p>
                        </div>
                        <span className="text-sm font-bold text-brand tabular-nums flex-shrink-0">{formatINR(item.pricePaise)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1 ml-auto md:ml-0">

              {/* Sell / Dashboard badge */}
              {user?.role === 'VENDOR' ? (
                <Link
                  to="/vendor"
                  className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-brand bg-brand-light hover:bg-brand hover:text-white px-3 py-1.5 rounded-lg transition-all"
                >
                  <Store className="w-3.5 h-3.5" />
                  Dashboard
                </Link>
              ) : user?.role === 'ADMIN' ? (
                <Link
                  to="/admin"
                  className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-amber bg-amber-light hover:bg-amber hover:text-white px-3 py-1.5 rounded-lg transition-all"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin
                </Link>
              ) : (
                <Link
                  to="/vendor/apply"
                  className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors px-2 py-1.5"
                >
                  <Store className="w-3.5 h-3.5" />
                  Sell
                </Link>
              )}

              {/* User menu */}
              <div ref={userMenuRef} className="relative">
                {user ? (
                  <>
                    <button
                      onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                      className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg text-sm font-medium text-ink hover:bg-paper border border-transparent hover:border-line transition-all focus-ring"
                    >
                      <div className="w-7 h-7 rounded-full bg-brand-light flex items-center justify-center flex-shrink-0">
                        <span className="text-brand font-bold text-xs">{user.name?.[0]?.toUpperCase()}</span>
                      </div>
                      <span className="hidden sm:block max-w-[90px] truncate text-sm">{user.name?.split(' ')[0]}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted hidden sm:block" />
                    </button>

                    {isUserMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56 bg-surface border border-line rounded-card shadow-modal z-50 overflow-hidden animate-fade-in">
                        <div className="px-4 py-3 border-b border-line bg-paper">
                          <p className="text-sm font-bold text-ink truncate">{user.name}</p>
                          <p className="text-xs text-muted mt-0.5 truncate">{user.email}</p>
                          <span className={`inline-block mt-1.5 text-2xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${user.role === 'ADMIN' ? 'bg-amber-light text-amber' :
                              user.role === 'VENDOR' ? 'bg-brand-light text-brand' :
                                'bg-paper border border-line text-muted'
                            }`}>
                            {user.role}
                          </span>
                        </div>
                        <div className="py-1.5">
                          <Link to="/orders" onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink hover:bg-paper transition-colors">
                            <Package className="w-4 h-4 text-muted" /> My Orders
                          </Link>
                          {user.role === 'VENDOR' && (
                            <Link to="/vendor" onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-sm text-brand font-semibold hover:bg-brand-subtle transition-colors">
                              <Store className="w-4 h-4" /> Vendor Dashboard
                            </Link>
                          )}
                          {user.role === 'ADMIN' && (
                            <Link to="/admin" onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-sm text-amber font-semibold hover:bg-amber-light transition-colors">
                              <ShieldCheck className="w-4 h-4" /> Admin Console
                            </Link>
                          )}
                          {user.role === 'CUSTOMER' && (
                            <Link to="/vendor/apply" onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink hover:bg-paper transition-colors">
                              <Sparkles className="w-4 h-4 text-muted" /> Become a Seller
                            </Link>
                          )}
                        </div>
                        <div className="border-t border-line py-1.5">
                          <button
                            onClick={() => { setIsUserMenuOpen(false); logout(); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-danger hover:bg-danger-light text-left transition-colors"
                          >
                            <LogOut className="w-4 h-4" /> Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to="/auth"
                    className="flex items-center gap-1.5 h-9 px-3 text-sm font-semibold text-ink border border-line rounded-lg hover:bg-paper hover:border-lineHover transition-all focus-ring"
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:block">Sign In</span>
                  </Link>
                )}
              </div>

              {/* Cart */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="relative flex items-center gap-1.5 h-9 px-3 bg-brand text-white rounded-lg hover:bg-brand-hover transition-colors shadow-btn focus-ring"
                aria-label="Cart"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="text-xs font-bold tabular-nums">{cartCount}</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Category nav bar */}
          <div className="hidden md:flex items-center gap-6 h-10 border-t border-line/60 overflow-x-auto scrollbar-none">
            <Link to="/search" className="text-xs font-semibold text-ink hover:text-brand whitespace-nowrap transition-colors">
              All Products
            </Link>
            {NAV_CATEGORIES.map((cat) => (
              <Link
                key={cat.href}
                to={cat.href}
                className="text-xs font-medium text-muted hover:text-ink whitespace-nowrap transition-colors"
              >
                {cat.label}
              </Link>
            ))}
            <div className="ml-auto">
              <Link to="/vendor/apply" className="flex items-center gap-1 text-xs font-semibold text-brand hover:text-brand-hover whitespace-nowrap">
                <Sparkles className="w-3 h-3" /> Sell on Haat
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-line bg-surface animate-fade-in">
            {/* Mobile search */}
            <div className="p-4 border-b border-line">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products…"
                  className="w-full h-10 pl-9 pr-4 bg-paper border border-line rounded-input text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </form>
            </div>
            <nav className="p-3 space-y-1">
              {NAV_CATEGORIES.map((cat) => (
                <Link key={cat.href} to={cat.href}
                  className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-ink hover:bg-paper transition-colors">
                  {cat.label}
                </Link>
              ))}
              <div className="border-t border-line my-2 pt-2">
                {!user ? (
                  <Link to="/auth" className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-brand hover:bg-brand-subtle transition-colors">
                    <User className="w-4 h-4" /> Sign In / Register
                  </Link>
                ) : (
                  <button onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-danger hover:bg-danger-light w-full transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};
