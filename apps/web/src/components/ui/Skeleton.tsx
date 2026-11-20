import React from 'react';
import { cn } from '../../lib/cn.js';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <div className={cn('shimmer rounded', className)} />
);
