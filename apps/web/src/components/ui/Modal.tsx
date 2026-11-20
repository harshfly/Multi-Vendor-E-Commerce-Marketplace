import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn.js';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div
        className={cn(
          'relative w-full bg-surface border border-line rounded-card shadow-xl p-6 z-10 transition-all animate-in fade-in zoom-in-95',
          maxWidths[maxWidth]
        )}
      >
        <div className="flex items-center justify-between pb-3 border-b border-line mb-4">
          {title && <h3 className="font-heading text-lg font-bold text-ink">{title}</h3>}
          <button
            onClick={onClose}
            className="p-1 rounded-full text-ink/50 hover:text-ink hover:bg-paper transition-colors ml-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

