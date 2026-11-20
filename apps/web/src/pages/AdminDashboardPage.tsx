import React, { useEffect, useState } from 'react';
import {
  ShieldCheck, TrendingUp, Users, ShoppingBag, Store,
  CheckCircle2, Ban, Edit2, IndianRupee, BarChart3,
  Package, ChevronRight, Clock, AlertTriangle
} from 'lucide-react';
import { api } from '../lib/api.js';
import { formatINR } from '../lib/money.js';
import { StatusBadge } from '../components/ui/Badge.js';
import { Skeleton } from '../components/ui/Skeleton.js';
import { toast } from 'sonner';

type Tab = 'analytics' | 'vendors' | 'orders' | 'users';

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ElementType; sub?: string; color?: string }> = ({
  label, value, icon: Icon, sub, color = 'text-brand'
}) => (
  <div className="bg-surface border border-line rounded-xl p-5 flex items-start justify-between">
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wider">{label}</p>
      <p className={`font-heading text-2xl font-bold mt-1.5 tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
    <div className="p-2.5 rounded-xl bg-brand-subtle flex-shrink-0">
      <Icon className="w-5 h-5 text-brand" />
    </div>
  </div>
);

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  const [analytics, setAnalytics] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Commission edit
  const [editVendor, setEditVendor] = useState<any>(null);
  const [commissionBps, setCommissionBps] = useState('1000');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [anRes, venRes, ordRes, usrRes] = await Promise.all([
        api.get('/admin/analytics'),
        api.get('/admin/vendors'),
        api.get('/admin/orders'),
        api.get('/admin/users'),
      ]);
      setAnalytics(anRes.data.analytics);
      setVendors(venRes.data.vendors || []);
      setOrders(ordRes.data.orders || []);
      setUsers(usrRes.data.users || []);
    } catch (err) {
      toast.error('Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleVendorApproval = async (vendorId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`/admin/vendors/${vendorId}/status`, { status });
      toast.success(`Vendor ${status.toLowerCase()}`);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update vendor');
    }
  };

  const handleUpdateCommission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVendor) return;
    setIsUpdating(true);
    try {
      await api.patch(`/admin/vendors/${editVendor.id}/commission`, { commissionBps: parseInt(commissionBps, 10) });
      toast.success('Commission updated');
      setEditVendor(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to update commission');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="section-container py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const TABS: { key: Tab; label: string; count?: number }[] = [
    { key: 'analytics', label: 'Analytics' },
    { key: 'vendors',   label: 'Vendors',  count: vendors.length },
    { key: 'orders',    label: 'Orders',   count: orders.length },
    { key: 'users',     label: 'Users',    count: users.length },
  ];

  return (
    <div className="bg-paper min-h-screen">
      <div className="section-container py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-amber-light border border-amber/20 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-amber" />
          </div>
          <div>
            <h1 className="font-heading text-xl font-bold text-ink">Admin Console</h1>
            <p className="text-sm text-muted mt-0.5">Platform oversight and management</p>
          </div>
        </div>

        {/* Commission edit modal */}
        {editVendor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setEditVendor(null)} />
            <div className="relative bg-surface border border-line rounded-2xl p-6 w-full max-w-sm shadow-modal animate-fade-up">
              <h3 className="font-heading text-lg font-bold text-ink mb-1">Edit Commission</h3>
              <p className="text-sm text-muted mb-5">{editVendor.storeName}</p>
              <form onSubmit={handleUpdateCommission} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Commission (basis points)</label>
                  <input type="number" value={commissionBps} onChange={e => setCommissionBps(e.target.value)} min="0" max="5000"
                    className="w-full h-10 px-3.5 border border-line rounded-input text-sm focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20" />
                  <p className="text-xs text-muted mt-1">{(parseInt(commissionBps||'0') / 100).toFixed(1)}% commission rate</p>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={isUpdating}
                    className="flex-1 h-10 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand-hover disabled:opacity-50 transition-colors">
                    {isUpdating ? 'Saving…' : 'Save'}
                  </button>
                  <button type="button" onClick={() => setEditVendor(null)}
                    className="px-5 h-10 border border-line rounded-xl text-sm font-semibold text-ink hover:bg-paper transition-colors">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-surface border border-line rounded-xl p-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.key ? 'bg-amber text-white shadow-btn' : 'text-muted hover:text-ink hover:bg-paper'
              }`}>
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white/20' : 'bg-line'}`}>{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── ANALYTICS ── */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={IndianRupee} label="Platform GMV"      value={formatINR(analytics?.platformGmvPaise || 0)} />
              <StatCard icon={BarChart3}   label="Commission Revenue" value={formatINR(analytics?.platformCommissionPaise || 0)} />
              <StatCard icon={Store}       label="Active Vendors"     value={analytics?.activeVendors || vendors.length} />
              <StatCard icon={ShoppingBag} label="Total Orders"       value={analytics?.totalOrders || orders.length} />
            </div>

            {/* Pending vendor approvals */}
            {vendors.filter(v => v.status === 'PENDING_REVIEW').length > 0 && (
              <div className="bg-amber-light border border-amber/30 rounded-xl p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber">
                    {vendors.filter(v => v.status === 'PENDING_REVIEW').length} vendor(s) awaiting approval
                  </p>
                  <button onClick={() => setActiveTab('vendors')}
                    className="text-xs font-semibold text-amber underline mt-0.5">
                    Review now →
                  </button>
                </div>
              </div>
            )}

            {/* Recent orders table */}
            <div className="bg-surface border border-line rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                <h3 className="font-heading font-bold text-sm text-ink">Recent Platform Orders</h3>
                <button onClick={() => setActiveTab('orders')} className="text-xs font-semibold text-brand hover:underline">
                  View all
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="bg-paper border-b border-line">
                    <tr>
                      {['Order #','Customer','Vendors','Total','Status'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {orders.slice(0, 8).map(ord => (
                      <tr key={ord.id} className="hover:bg-paper transition-colors">
                        <td className="px-5 py-3.5 font-mono font-bold text-xs text-ink">{ord.number}</td>
                        <td className="px-5 py-3.5 text-xs text-muted">{ord.user?.name || '—'}</td>
                        <td className="px-5 py-3.5 text-xs text-muted">{ord.vendorOrders?.length || 0}</td>
                        <td className="px-5 py-3.5 font-bold text-sm text-brand tabular-nums">{formatINR(ord.totalPaise)}</td>
                        <td className="px-5 py-3.5"><StatusBadge status={ord.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── VENDORS ── */}
        {activeTab === 'vendors' && (
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h3 className="font-heading font-bold text-sm text-ink">All Vendors ({vendors.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead className="bg-paper border-b border-line">
                  <tr>
                    {['Store','Owner','Status','Commission','Joined','Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {vendors.map(v => (
                    <tr key={v.id} className="hover:bg-paper transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-ink text-sm">{v.storeName}</p>
                        <p className="text-xs text-muted mt-0.5">{v.slug}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted">{v.user?.name || '—'}</td>
                      <td className="px-5 py-4"><StatusBadge status={v.status} /></td>
                      <td className="px-5 py-4 font-mono font-semibold text-sm text-ink">{(v.commissionBps / 100).toFixed(1)}%</td>
                      <td className="px-5 py-4 text-xs text-muted whitespace-nowrap">
                        {new Date(v.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'2-digit' })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {v.status === 'PENDING_REVIEW' && (
                            <>
                              <button onClick={() => handleVendorApproval(v.id, 'APPROVED')}
                                className="flex items-center gap-1 text-xs font-semibold text-success border border-success/30 px-2.5 py-1 rounded-lg hover:bg-success hover:text-white transition-all">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button onClick={() => handleVendorApproval(v.id, 'REJECTED')}
                                className="flex items-center gap-1 text-xs font-semibold text-danger border border-danger/20 px-2.5 py-1 rounded-lg hover:bg-danger hover:text-white transition-all">
                                <Ban className="w-3.5 h-3.5" /> Reject
                              </button>
                            </>
                          )}
                          <button onClick={() => { setEditVendor(v); setCommissionBps(String(v.commissionBps)); }}
                            className="flex items-center gap-1 text-xs font-semibold text-muted border border-line px-2.5 py-1 rounded-lg hover:text-ink hover:bg-paper transition-all">
                            <Edit2 className="w-3.5 h-3.5" /> Rate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ORDERS ── */}
        {activeTab === 'orders' && (
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h3 className="font-heading font-bold text-sm text-ink">All Platform Orders ({orders.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead className="bg-paper border-b border-line">
                  <tr>
                    {['Order #','Customer','Vendors','GMV','Commission','Status'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {orders.map(ord => (
                    <tr key={ord.id} className="hover:bg-paper transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-xs text-ink">{ord.number}</td>
                      <td className="px-5 py-3.5 text-xs text-muted">{ord.user?.name || '—'}</td>
                      <td className="px-5 py-3.5 text-xs text-muted">{ord.vendorOrders?.length || 0}</td>
                      <td className="px-5 py-3.5 font-bold text-sm text-brand tabular-nums">{formatINR(ord.totalPaise)}</td>
                      <td className="px-5 py-3.5 font-semibold text-sm text-muted tabular-nums">{formatINR(ord.platformCommissionPaise || 0)}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={ord.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {activeTab === 'users' && (
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h3 className="font-heading font-bold text-sm text-ink">All Users ({users.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-paper border-b border-line">
                  <tr>
                    {['Name','Email','Role','Joined'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-bold text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-paper transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-sm text-ink">{u.name}</td>
                      <td className="px-5 py-3.5 text-xs text-muted">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`pill ${
                          u.role === 'ADMIN'    ? 'bg-amber-light text-amber border border-amber/20' :
                          u.role === 'VENDOR'   ? 'bg-brand-subtle text-brand border border-brand/20' :
                          'bg-paper text-muted border border-line'
                        }`}>{u.role}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted whitespace-nowrap">
                        {new Date(u.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
