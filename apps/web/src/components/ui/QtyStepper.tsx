import React from 'react';
import { Minus, Plus } from 'lucide-react';

export interface QtyStepperProps {
  value: number;
  max?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const QtyStepper: React.FC<QtyStepperProps> = ({ value, max = 99, onChange, disabled }) => {
  return (
    <div className="inline-flex items-center border border-line rounded-input bg-surface overflow-hidden">
      <button
        type="button"
        disabled={disabled || value <= 1}
        onClick={() => onChange(Math.max(1, value - 1))}
        className="p-1.5 text-ink/60 hover:text-ink hover:bg-paper disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="w-8 text-center text-xs font-medium tabular-nums text-ink select-none">
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="p-1.5 text-ink/60 hover:text-ink hover:bg-paper disabled:opacity-30 disabled:pointer-events-none transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

