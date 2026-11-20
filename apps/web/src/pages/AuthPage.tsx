import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth-context.js';
import { ShieldCheck, Store, User, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const DEMO_ACCOUNTS = [
  { role: 'Admin',    email: 'admin@haat.test',    icon: ShieldCheck, color: 'text-amber',   bg: 'bg-amber-light hover:bg-amber hover:text-white border-amber/20', redirect: '/admin' },
  { role: 'Vendor',  email: 'vendor1@haat.test',   icon: Store,       color: 'text-brand',   bg: 'bg-brand-subtle hover:bg-brand hover:text-white border-brand/20', redirect: '/vendor' },
  { role: 'Customer',email: 'customer@haat.test',  icon: User,        color: 'text-ink',     bg: 'bg-paper hover:bg-ink hover:text-white border-line', redirect: '/orders' },
];

export const AuthPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isRegister) {
        await register({ email, password, name });
        toast.success('Welcome to Haat! Account created.');
      } else {
        await login({ email, password });
        toast.success('Signed in successfully');
      }
      navigate(redirect);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (acc: typeof DEMO_ACCOUNTS[0]) => {
    setIsLoading(true);
    try {
      await login({ email: acc.email, password: 'Demo@1234' });
      toast.success(`Signed in as ${acc.role}`);
      navigate(acc.redirect);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand mx-auto flex items-center justify-center shadow-lg mb-4">
            <span className="text-white font-heading font-bold text-xl">ह</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-ink">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-muted mt-1.5">
            {isRegister
              ? 'Join thousands of shoppers on Haat Marketplace'
              : 'Sign in to access your orders and dashboard'}
          </p>
        </div>

        {/* Demo cards */}
        <div className="mb-6 p-4 bg-surface border border-line rounded-xl">
          <p className="text-xs font-bold text-muted text-center mb-3 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            One-click demo accounts
          </p>
          <div className="grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map(acc => {
              const Icon = acc.icon;
              return (
                <button
                  key={acc.role}
                  onClick={() => handleDemoLogin(acc)}
                  disabled={isLoading}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-semibold transition-all disabled:opacity-50 ${acc.bg}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{acc.role}</span>
                </button>
              );
            })}
          </div>
          <p className="text-center text-2xs text-muted mt-2.5">Password: <code className="font-mono text-ink">Demo@1234</code></p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-line" />
          <span className="text-xs text-muted font-medium">or sign in with email</span>
          <div className="flex-1 h-px bg-line" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-xl p-6 shadow-card space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Rohan Sharma"
                className="w-full h-11 px-3.5 bg-paper border border-line rounded-input text-sm text-ink placeholder:text-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-11 px-3.5 bg-paper border border-line rounded-input text-sm text-ink placeholder:text-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 px-3.5 pr-10 bg-paper border border-line rounded-input text-sm text-ink placeholder:text-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-all"
              />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-brand hover:bg-brand-hover text-white font-semibold rounded-input transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <span className="animate-spin rounded-full border-2 border-white/30 border-t-white w-4 h-4" />
            ) : (
              <>
                {isRegister ? 'Create Account' : 'Sign In'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-5">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="font-semibold text-brand hover:text-brand-hover transition-colors"
          >
            {isRegister ? 'Sign In' : 'Create one'}
          </button>
        </p>
      </div>
    </div>
  );
};
