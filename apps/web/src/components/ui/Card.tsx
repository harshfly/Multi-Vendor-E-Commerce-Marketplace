import React from 'react';
import { cn } from '../../lib/cn.js';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <div className={cn('bg-surface border border-line rounded-card overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.02)]', className)} {...props}>
      {children}
    </div>
  );
};

