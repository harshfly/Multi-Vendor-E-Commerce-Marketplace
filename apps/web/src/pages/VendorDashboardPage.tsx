import React, { useEffect, useState } from 'react';
import {
  Store, Package, ShoppingBag, Plus, CheckCircle2, Clock, AlertTriangle,
  Truck, TrendingUp, Settings, Edit, Trash2, ChevronRight, BarChart3,
  IndianRupee, Users, Eye
} from 'lucide-react';
import { api } from '../lib/api.js';
import { formatINR, rupeesToPaise } from '../lib/money.js';
import { StatusBadge } from '../components/ui/Badge.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { toast } from 'sonner';
import { useAuth } from '../lib/auth-context.js';
import { Link } from 'react-router-dom';

type Tab = 'overview' | 'products' | 'orders' | 'settings';

const StatCard: React.FC<{ label: string; value: string; sub?: string; icon: React.ElementType; color?: string }> = ({
  label, value, sub, icon: Icon, color = 'text-brand'
}) => (
  <div className="bg-surface border border-line rounded-xl p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</p>
        <p className={`font-heading text-2xl font-bold mt-1.5 tabular-nums ${color}`}>{value}</p>
        {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
      </div>
      <div className="p-2.5 rounded-xl bg-brand-subtle">
        <Icon className="w-5 h-5 text-brand" />
      </div>
    </div>
  </div>
);

export const VendorDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add product form
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newMrp, setNewMrp] = useState('');
  const [newStock, setNewStock] = useState('10');
  const [newCatId, setNewCatId] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Ship modal
  const [shipOrderId, setShipOrderId] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isShipping, setIsShipping] = useState(false);

  // Payout
  const [payout, setPayout] = useState({ accountNumber: '', ifscCode: '', beneficiaryName: '' });
  const [isSavingPayout, setIsSavingPayout] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [profRes, anRes, prodRes, ordRes, catRes] = await Promise.all([
        api.get('/vendors/me/profile'),
        api.get('/vendors/me/analytics'),
        api.get('/products/vendor/mine'),
        api.get('/vendors/me/orders'),
        api.get('/products/categories/tree'),
      ]);
      setVendorProfile(profRes.data.vendor);
      setAnalytics(anRes.data.analytics);
      setProducts(prodRes.data.products || []);
      setOrders(ordRes.data.orders || []);
      setCategories(catRes.data.categories || []);
      if (catRes.data.categories?.[0]) setNewCatId(catRes.data.categories[0].id);
    } catch (err: any) {
      toast.error('Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/products', {
        title: newTitle, description: newDesc,
        pricePaise: rupeesToPaise(parseFloat(newPrice)),
        mrpPaise: newMrp ? rupeesToPaise(parseFloat(newMrp)) : undefined,
        stock: parseInt(newStock, 10), categoryId: newCatId,
        imageUrls: [newImageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'],
      });
      toast.success('Product published!');
      setShowAddProduct(false);
      setNewTitle(''); setNewDesc(''); setNewPrice(''); setNewMrp('');
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, status: string, tracking?: string) => {
    try {
      await api.patch(`/vendor-orders/${orderId}/status`, { status, trackingNumber: tracking });
      toast.success(`Order ${status.toLowerCase()}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update status');
    }
  };

  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPayout(true);
    try {
      await api.post('/vendors/me/payout-account', payout);
      toast.success('Payout account saved!');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to save payout info');
    } finally {
      setIsSavingPayout(false);
    }
  };

  if (isLoading) {
    return (
      <div className="section-container py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!vendorProfile) {
    return (
      <div className="section-container py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-paper border border-line flex items-center justify-center mx-auto mb-4">
          <Store className="w-8 h-8 text-muted" />
        </div>
        <h2 className="font-heading text-xl font-bold text-ink">Not a Vendor Yet</h2>
        <p className="text-sm text-muted mt-2 max-w-xs mx-auto">You need vendor access to view this page.</p>
        <Link to="/vendor/apply" className="inline-flex items-center gap-2 mt-5 px-6 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-hover transition-colors">
          Apply to Sell <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const isApproved = vendorProfile.status === 'APPROVED';

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview',  label: 'Overview' },
    { key: 'products',  label: 'Products',  count: products.length },
    { key: 'orders',    label: 'Orders',    count: orders.length },
    { key: 'settings',  label: 'Settings' },
  ];

  return (
    <div className="bg-paper min-h-screen">
      <div className="section-container py-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-brand-subtle border border-brand/20 flex items-center justify-center">
              <Store className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold text-ink leading-tight">{vendorProfile.storeName}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusBadge status={vendorProfile.status} />
                <span className="text-xs text-muted">· {(vendorProfile.commissionBps / 100).toFixed(1)}% commission</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setShowAddProduct(true); setActiveTab('products'); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover transition-colors shadow-btn self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {/* Onboarding banner */}
        {!isApproved && (
          <div className="mb-6 p-4 bg-amber-light border border-amber/30 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber">Pending Admin Approval</p>
              <p className="text-xs text-amber/80 mt-0.5">Your store is under review. You can add products now, but they'll go live after approval.</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-surface border border-line rounded-xl p-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-brand text-white shadow-btn'
                  : 'text-muted hover:text-ink hover:bg-paper'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white/20' : 'bg-line'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={IndianRupee} label="Gross Revenue"    value={formatINR(analytics?.totalRevenuePaise || 0)} color="text-ink" />
              <StatCard icon={TrendingUp}  label="Net Payout"       value={formatINR(analytics?.totalPayoutPaise || 0)}  color="text-brand" />
              <StatCard icon={BarChart3}   label="Commission"       value={formatINR(analytics?.totalCommissionPaise || 0)} color="text-muted" />
              <StatCard icon={ShoppingBag} label="Total Orders"     value={String(analytics?.totalOrders || orders.length)} />
            </div>

            {/* Recent orders */}
            <div className="bg-surface border border-line rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                <h3 className="font-heading font-bold text-sm text-ink">Recent Orders</h3>
                <button onClick={() => setActiveTab('orders')} className="text-xs font-semibold text-brand hover:underline">
                  View all
                </button>
              </div>
              {orders.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="w-10 h-10 text-muted mx-auto mb-2" />
                  <p className="text-sm text-muted">No orders yet</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-paper border-b border-line">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-wider">Order</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-wider hidden sm:table-cell">Items</th>
                      <th className="px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-muted uppercase tracking-wider">Payout</th>
                      <th className="px-5 py-3 text-right text-xs font-bold text-muted uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {orders.slice(0, 6).map(ord => (
                      <tr key={ord.id} className="hover:bg-paper transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-xs text-ink">{ord.order?.number || '—'}</td>
                        <td className="px-5 py-3.5 text-xs text-muted hidden sm:table-cell">{ord.items?.length || 0} items</td>
                        <td className="px-5 py-3.5"><StatusBadge status={ord.status} /></td>
                        <td className="px-5 py-3.5 text-right font-bold text-sm text-brand tabular-nums">{formatINR(ord.vendorPayoutPaise)}</td>
                        <td className="px-5 py-3.5 text-right">
                          {ord.status === 'PLACED' && (
                            <button onClick={() => handleStatusUpdate(ord.id, 'PACKED')}
                              className="text-xs font-semibold text-brand border border-brand/20 px-2.5 py-1 rounded-lg hover:bg-brand hover:text-white transition-all">
                              Pack
                            </button>
                          )}
                          {ord.status === 'PACKED' && (
                            <button onClick={() => { setShipOrderId(ord.id); setTrackingNumber(`DTDC${Math.floor(100000+Math.random()*900000)}`); }}
                              className="text-xs font-semibold bg-brand text-white px-2.5 py-1 rounded-lg hover:bg-brand-hover transition-all">
                              Ship
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Product quick view */}
            <div className="bg-surface border border-line rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                <h3 className="font-heading font-bold text-sm text-ink">Your Products</h3>
                <button onClick={() => setActiveTab('products')} className="text-xs font-semibold text-brand hover:underline">
                  Manage all
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                {products.slice(0, 4).map(p => (
                  <Link key={p.id} to={`/products/${p.slug}`}
                    className="group border border-line rounded-lg overflow-hidden hover:border-brand/30 transition-all">
                    <div className="aspect-square overflow-hidden bg-paper">
                      <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold text-ink truncate">{p.title}</p>
                      <p className="text-xs font-bold text-brand mt-0.5">{formatINR(p.pricePaise)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PRODUCTS ── */}
        {activeTab === 'products' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-ink">Your Catalog ({products.length})</h2>
              <button onClick={() => setShowAddProduct(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover transition-colors">
                <Plus className="w-4 h-4" /> New Product
              </button>
            </div>

            {/* Add product form */}
            {showAddProduct && (
              <div className="bg-surface border border-brand/30 rounded-xl p-6 shadow-card animate-fade-in">
                <h3 className="font-heading font-bold text-base text-ink mb-5">Add New Product</h3>
                <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-ink mb-1.5">Product Title *</label>
                    <input required value={newTitle} onChange={e => setNewTitle(e.target.value)}
                      placeholder="e.g. Handwoven Chanderi Silk Dupatta"
                      className="w-full h-10 px-3.5 border border-line rounded-input text-sm bg-paper focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-ink mb-1.5">Description *</label>
                    <textarea required value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3}
                      placeholder="Detailed product description…"
                      className="w-full px-3.5 py-2.5 border border-line rounded-input text-sm bg-paper focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Selling Price (₹) *</label>
                    <input required type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)}
                      placeholder="1299"
                      className="w-full h-10 px-3.5 border border-line rounded-input text-sm bg-paper focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">MRP (₹) — optional</label>
                    <input type="number" value={newMrp} onChange={e => setNewMrp(e.target.value)}
                      placeholder="1799"
                      className="w-full h-10 px-3.5 border border-line rounded-input text-sm bg-paper focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Stock Quantity *</label>
                    <input required type="number" value={newStock} onChange={e => setNewStock(e.target.value)}
                      className="w-full h-10 px-3.5 border border-line rounded-input text-sm bg-paper focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Category *</label>
                    <select value={newCatId} onChange={e => setNewCatId(e.target.value)} required
                      className="w-full h-10 px-3.5 border border-line rounded-input text-sm bg-paper focus:outline-none focus:border-brand">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-ink mb-1.5">Image URL (optional)</label>
                    <input value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/…"
                      className="w-full h-10 px-3.5 border border-line rounded-input text-sm bg-paper focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                  </div>
                  <div className="md:col-span-2 flex gap-3 pt-2">
                    <button type="submit" disabled={isSaving}
                      className="px-6 h-10 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover disabled:opacity-50 transition-colors flex items-center gap-2">
                      {isSaving && <span className="animate-spin rounded-full border-2 border-white/30 border-t-white w-3.5 h-3.5" />}
                      Publish Product
                    </button>
                    <button type="button" onClick={() => setShowAddProduct(false)}
                      className="px-5 h-10 border border-line rounded-xl text-sm font-semibold text-ink hover:bg-paper transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Products grid */}
            {products.length === 0 ? (
              <div className="bg-surface border border-line rounded-xl py-20 text-center">
                <Package className="w-12 h-12 text-muted mx-auto mb-3" />
                <h3 className="font-heading text-lg font-bold text-ink">No products yet</h3>
                <p className="text-sm text-muted mt-1">Add your first product to get started</p>
                <button onClick={() => setShowAddProduct(true)}
                  className="mt-5 px-6 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover transition-colors">
                  Add Product
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map(p => (
                  <div key={p.id} className="bg-surface border border-line rounded-xl overflow-hidden hover:shadow-card-hover hover:border-lineHover transition-all group">
                    <Link to={`/products/${p.slug}`} className="block aspect-[4/3] overflow-hidden bg-paper">
                      <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </Link>
                    <div className="p-3.5">
                      <p className="font-semibold text-sm text-ink line-clamp-1">{p.title}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="font-bold text-brand text-sm">{formatINR(p.pricePaise)}</span>
                        <span className="text-xs text-muted">{p.stock} in stock</span>
                      </div>
                      <div className="flex gap-1.5 mt-3">
                        <Link to={`/products/${p.slug}`}
                          className="flex-1 flex items-center justify-center gap-1 h-8 text-xs font-semibold border border-line rounded-lg hover:bg-paper transition-colors text-muted">
                          <Eye className="w-3.5 h-3.5" /> View
                        </Link>
                        <button className="flex-1 flex items-center justify-center gap-1 h-8 text-xs font-semibold border border-brand/30 text-brand rounded-lg hover:bg-brand-subtle transition-colors">
                          <Edit className="w-3.5 h-3.5" /> Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ORDERS ── */}
        {activeTab === 'orders' && (
          <div className="space-y-5">
            <h2 className="font-heading text-lg font-bold text-ink">Store Orders ({orders.length})</h2>

            {/* Ship modal */}
            {shipOrderId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setShipOrderId('')} />
                <div className="relative bg-surface border border-line rounded-2xl p-6 w-full max-w-sm shadow-modal animate-fade-up">
                  <h3 className="font-heading text-lg font-bold text-ink mb-4">Ship Order</h3>
                  <div>
                    <label className="block text-xs font-semibold text-ink mb-1.5">Tracking Number</label>
                    <input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)}
                      className="w-full h-10 px-3.5 border border-line rounded-input font-mono text-sm focus:outline-none focus:border-brand" />
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button
                      onClick={async () => { setIsShipping(true); await handleStatusUpdate(shipOrderId, 'SHIPPED', trackingNumber); setShipOrderId(''); setIsShipping(false); }}
                      disabled={isShipping}
                      className="flex-1 h-10 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover disabled:opacity-50 transition-colors">
                      {isShipping ? 'Shipping…' : 'Mark Shipped'}
                    </button>
                    <button onClick={() => setShipOrderId('')}
                      className="px-5 h-10 border border-line rounded-xl text-sm text-ink hover:bg-paper transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-surface border border-line rounded-xl overflow-hidden">
              {orders.length === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingBag className="w-10 h-10 text-muted mx-auto mb-2" />
                  <p className="text-sm text-muted">No orders received yet</p>
                </div>
              ) : (
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-paper border-b border-line">
                    <tr>
                      {['Order #','Date','Items','Status','Net Payout','Action'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-wider first:rounded-tl-xl">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {orders.map(ord => (
                      <tr key={ord.id} className="hover:bg-paper transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-xs text-ink">{ord.order?.number || '—'}</td>
                        <td className="px-5 py-4 text-xs text-muted whitespace-nowrap">
                          {new Date(ord.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                        </td>
                        <td className="px-5 py-4 text-xs text-muted">{ord.items?.length || 0} items</td>
                        <td className="px-5 py-4"><StatusBadge status={ord.status} /></td>
                        <td className="px-5 py-4 font-bold text-brand tabular-nums">{formatINR(ord.vendorPayoutPaise)}</td>
                        <td className="px-5 py-4">
                          <div className="flex gap-1.5">
                            {ord.status === 'PLACED' && (
                              <button onClick={() => handleStatusUpdate(ord.id, 'PACKED')}
                                className="text-xs font-semibold text-brand border border-brand/30 px-2.5 py-1 rounded-lg hover:bg-brand hover:text-white transition-all">
                                Pack
                              </button>
                            )}
                            {ord.status === 'PACKED' && (
                              <button onClick={() => { setShipOrderId(ord.id); setTrackingNumber(`DTDC${Math.floor(100000+Math.random()*900000)}`); }}
                                className="text-xs font-semibold bg-brand text-white px-2.5 py-1 rounded-lg hover:bg-brand-hover transition-all">
                                Ship
                              </button>
                            )}
                            {ord.status === 'SHIPPED' && (
                              <button onClick={() => handleStatusUpdate(ord.id, 'DELIVERED')}
                                className="text-xs font-semibold text-success border border-success/30 px-2.5 py-1 rounded-lg hover:bg-success hover:text-white transition-all">
                                Delivered
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS ── */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-xl">
            <h2 className="font-heading text-lg font-bold text-ink">Store Settings</h2>

            <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
              <h3 className="font-heading font-bold text-sm text-ink">Payout Account</h3>
              <form onSubmit={handleSavePayout} className="space-y-4">
                {[
                  { key: 'beneficiaryName', label: 'Account Holder Name', placeholder: 'As per bank records' },
                  { key: 'accountNumber',   label: 'Account Number', placeholder: '1234567890' },
                  { key: 'ifscCode',        label: 'IFSC Code', placeholder: 'HDFC0001234' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-ink mb-1.5">{label}</label>
                    <input
                      value={(payout as any)[key]}
                      onChange={e => setPayout(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full h-10 px-3.5 border border-line rounded-input text-sm bg-paper focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </div>
                ))}
                <button type="submit" disabled={isSavingPayout}
                  className="h-10 px-6 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover disabled:opacity-50 transition-colors">
                  {isSavingPayout ? 'Saving…' : 'Save Payout Account'}
                </button>
              </form>
            </div>

            <div className="bg-surface border border-line rounded-xl p-5">
              <h3 className="font-heading font-bold text-sm text-ink mb-3">Store Info</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between py-2 border-b border-line">
                  <span className="text-muted">Store Name</span>
                  <span className="font-semibold text-ink">{vendorProfile.storeName}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-line">
                  <span className="text-muted">Status</span>
                  <StatusBadge status={vendorProfile.status} />
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted">Commission Rate</span>
                  <span className="font-semibold text-ink">{(vendorProfile.commissionBps / 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
