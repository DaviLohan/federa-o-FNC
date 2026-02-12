import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  actions,
  width = 'md',
  className = '',
}: DrawerProps) {
  const widthClasses = {
    sm: 'sm:w-96',
    md: 'sm:w-[480px] lg:w-[600px]',
    lg: 'sm:w-[600px] lg:w-[800px]',
  };

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-reveal"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full ${widthClasses[width]} bg-surface1 shadow-2xl shadow-black/50 z-50 overflow-y-auto animate-slide-in-right ${className}`}
      >
        {/* Gradient Top Border */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-gold via-gold to-gold2 opacity-70" />

        {/* Header */}
        <div className="sticky top-0 bg-surface1 border-b border-border px-6 py-4 z-10">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-text">{title}</h2>
              {subtitle && <p className="text-muted mt-1">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="text-muted hover:text-text transition-colors p-1 hover:bg-surface2 rounded-lg"
              aria-label="Close drawer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>

        {/* Actions Footer */}
        {actions && (
          <div className="sticky bottom-0 bg-surface1 border-t border-border px-6 py-4">
            <div className="flex justify-end gap-3">{actions}</div>
          </div>
        )}
      </div>
    </>
  );
}

// Add animation to globals.css
// @keyframes slide-in-right {
//   from {
//     transform: translateX(100%);
//   }
//   to {
//     transform: translateX(0);
//   }
// }
// .animate-slide-in-right {
//   animation: slide-in-right 0.3s ease-out;
// }
