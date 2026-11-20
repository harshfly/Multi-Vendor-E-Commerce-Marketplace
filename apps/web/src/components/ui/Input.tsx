import React from 'react';
import { cn } from '../../lib/cn.js';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-ink/70">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink/40">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full bg-surface border border-line rounded-input px-3.5 py-2 text-sm text-ink placeholder:text-ink/40',
              'focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand transition-all',
              leftIcon && 'pl-10',
              error && 'border-danger focus:ring-danger focus:border-danger',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-danger font-medium">{error}</p>}
        {helperText && !error && <p className="text-xs text-ink/60">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

