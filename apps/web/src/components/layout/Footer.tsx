import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Truck, RotateCcw, CreditCard, Instagram, Twitter, Youtube, Mail } from 'lucide-react';

const TRUST_SIGNALS = [
  { icon: ShieldCheck, title: 'Verified Sellers', desc: 'Every vendor is manually reviewed' },
  { icon: Truck,       title: 'Pan-India Delivery', desc: 'Per-vendor tracking on every order' },
  { icon: CreditCard,  title: 'Secure Checkout', desc: 'Split payments with escrow protection' },
  { icon: RotateCcw,   title: 'Easy Returns', desc: 'Instant refunds before dispatch' },
];

const SHOP_LINKS = [
  { label: 'Handloom Sarees', href: '/search?category=sarees' },
  { label: 'Pottery & Ceramics', href: '/search?category=ceramics' },
  { label: 'Electronics & Audio', href: '/search?category=electronics' },
  { label: 'Artisan Crafts', href: '/search?category=artisan-crafts' },
  { label: 'All Products', href: '/search' },
];

const SELLER_LINKS = [
  { label: 'Apply as Seller', href: '/vendor/apply' },
  { label: 'Vendor Dashboard', href: '/vendor' },
  { label: 'Pricing & Commission', href: '/vendor/apply' },
  { label: 'Seller Login', href: '/auth' },
];

export const Footer: React.FC = () => (
  <footer className="bg-ink text-white/70 mt-20">
    {/* Trust signals strip */}
    <div className="border-b border-white/10">
      <div className="section-container py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
        {TRUST_SIGNALS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3">
            <div className="mt-0.5 p-2 rounded-lg bg-white/10 flex-shrink-0">
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">{title}</h4>
              <p className="text-xs text-white/50 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Main footer */}
    <div className="section-container py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
      {/* Brand */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-brand flex items-center justify-center">
            <span className="text-white font-bold text-sm">ह</span>
          </div>
          <span className="font-heading text-lg font-bold text-white">Haat</span>
        </div>
        <p className="text-sm text-white/50 leading-relaxed">
          India's open marketplace connecting authentic artisans, independent creators, and specialized manufacturers directly with conscious shoppers.
        </p>
        <div className="flex items-center gap-3 mt-5">
          {[Instagram, Twitter, Youtube].map((Icon, i) => (
            <a key={i} href="#" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <Icon className="w-4 h-4 text-white/70" />
            </a>
          ))}
        </div>
      </div>

      {/* Shop */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Shop</h4>
        <ul className="space-y-2.5">
          {SHOP_LINKS.map(({ label, href }) => (
            <li key={href}>
              <Link to={href} className="text-sm text-white/60 hover:text-white transition-colors">{label}</Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Sellers */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Sellers</h4>
        <ul className="space-y-2.5">
          {SELLER_LINKS.map(({ label, href }) => (
            <li key={href}>
              <Link to={href} className="text-sm text-white/60 hover:text-white transition-colors">{label}</Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Demo credentials */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-4">Demo Accounts</h4>
        <div className="bg-white/5 border border-white/10 rounded-card p-4 space-y-2.5 text-xs">
          {[
            { role: 'Admin',    email: 'admin@haat.test',    color: 'text-amber' },
            { role: 'Vendor',   email: 'vendor1@haat.test',  color: 'text-brand-light' },
            { role: 'Customer', email: 'customer@haat.test', color: 'text-white' },
          ].map(({ role, email, color }) => (
            <div key={role}>
              <span className={`font-semibold ${color}`}>{role}: </span>
              <span className="text-white/50 font-mono">{email}</span>
            </div>
          ))}
          <p className="text-white/30 pt-1 border-t border-white/10">Password: <code className="text-white/50">Demo@1234</code></p>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
          <Mail className="w-3.5 h-3.5" />
          <span>hello@haat.marketplace</span>
        </div>
      </div>
    </div>

    <div className="border-t border-white/10 py-5 text-center text-xs text-white/30">
      © {new Date().getFullYear()} Haat Multi-Vendor Marketplace · Built with React, Node.js, Prisma & PostgreSQL
    </div>
  </footer>
);
