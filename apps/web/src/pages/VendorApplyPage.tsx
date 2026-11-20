import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth-context.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { toast } from 'sonner';

export const VendorApplyPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in before applying');
      navigate('/auth?redirect=/vendor/apply');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/vendors/apply', {
        storeName,
        description,
        logoUrl: logoUrl || undefined,
      });
      await refreshUser();
      toast.success('Application submitted! Pending admin approval.');
      navigate('/vendor');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Application failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-card bg-brand-light text-brand flex items-center justify-center mx-auto">
          <Store className="w-6 h-6" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-ink">Apply as a Merchant on Haat</h1>
        <p className="text-xs text-ink/60 max-w-md mx-auto">
          Sell your handcrafted goods, textiles, and products directly to discerning shoppers across India.
        </p>
      </div>

      <div className="bg-surface border border-line rounded-card p-6 sm:p-8 shadow-xs space-y-6">
        <div className="grid grid-cols-3 gap-3 text-center pb-6 border-b border-line text-xs">
          <div>
            <span className="font-bold text-brand block">8-12%</span>
            <span className="text-ink/50 text-[11px]">Fair Commission</span>
          </div>
          <div>
            <span className="font-bold text-brand block">Instant</span>
            <span className="text-ink/50 text-[11px]">Direct Payouts</span>
          </div>
          <div>
            <span className="font-bold text-brand block">Zero</span>
            <span className="text-ink/50 text-[11px]">Listing Fees</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Store / Brand Name"
            placeholder="e.g. Jaipur Indigo Handlooms"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
            minLength={3}
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink/70 mb-1">
              Store Story & Product Craft
            </label>
            <textarea
              rows={4}
              required
              minLength={15}
              placeholder="Tell shoppers about your workshop, materials, origins, and craft techniques..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface border border-line rounded-input p-3 text-sm text-ink placeholder:text-ink/40 focus:ring-2 focus:ring-brand focus:outline-none"
            />
          </div>

          <Input
            label="Logo or Workshop Photo URL (Optional)"
            placeholder="https://images.unsplash.com/..."
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />

          <Button type="submit" size="lg" isLoading={isLoading} className="w-full font-bold text-sm">
            Submit Seller Application
          </Button>
        </form>
      </div>
    </div>
  );
};

