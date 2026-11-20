import React from 'react';
import { cn } from '../../lib/cn.js';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'outline' | 'brand';
  className?: string;
}

const VARIANTS: Record<string, string> = {
  default:  'bg-paper border border-line text-muted',
  brand:    'bg-brand-subtle border border-brand/20 text-brand',
  success:  'bg-success/10 border border-success/20 text-success',
  danger:   'bg-danger-light border border-danger/20 text-danger',
  warning:  'bg-amber-light border border-amber/20 text-amber',
  outline:  'border border-current bg-transparent',
};

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className }) => (
  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', VARIANTS[variant], className)}>
    {children}
  </span>
);

// Status badge helper
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    PENDING:    { variant: 'warning', label: 'Pending' },
    CONFIRMED:  { variant: 'brand',   label: 'Confirmed' },
    PAID:       { variant: 'brand',   label: 'Paid' },
    SHIPPED:    { variant: 'brand',   label: 'Shipped' },
    DELIVERED:  { variant: 'success', label: 'Delivered' },
    CANCELLED:  { variant: 'danger',  label: 'Cancelled' },
    REFUNDED:   { variant: 'outline', label: 'Refunded' },
    ACTIVE:     { variant: 'success', label: 'Active' },
    INACTIVE:   { variant: 'default', label: 'Inactive' },
    APPROVED:   { variant: 'success', label: 'Approved' },
    PENDING_REVIEW: { variant: 'warning', label: 'Pending Review' },
  };
  const cfg = map[status] || { variant: 'default' as const, label: status };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};
