import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button.js';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-line rounded-card bg-surface/50 my-6">
      {Icon && (
        <div className="p-3 bg-paper rounded-full text-brand mb-3">
          <Icon className="w-8 h-8" />
        </div>
      )}
      <h3 className="font-heading text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="text-sm text-ink/60 max-w-sm mt-1">{description}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-4" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

