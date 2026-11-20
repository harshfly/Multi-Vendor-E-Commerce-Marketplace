import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/cn.js';

interface RatingProps {
  rating: number;
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
}

export const Rating: React.FC<RatingProps> = ({ rating, count, size = 'sm', className }) => {
  const starSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < Math.floor(rating);
          const half   = !filled && i < rating;
          return (
            <Star
              key={i}
              className={cn(starSize, filled || half ? 'text-amber fill-amber' : 'text-line fill-line')}
            />
          );
        })}
      </div>
      <span className={cn(textSize, 'font-semibold text-ink tabular-nums')}>{rating.toFixed(1)}</span>
      {count !== undefined && (
        <span className={cn(textSize, 'text-muted')}>({count})</span>
      )}
    </div>
  );
};
