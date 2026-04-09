'use client';

import { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  stickyFooter?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showCloseButton?: boolean;
  /** When true + stickyFooter, modal stretches to near-fullscreen height */
  fullHeight?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  stickyFooter,
  size = 'md',
  showCloseButton = true,
  fullHeight = false,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  // Ensure we only render the portal on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on ESC key + body scroll lock with scrollbar compensation
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);

    // Compensate for scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
  };

  // Header component (shared between both modes)
  const header = (
    <div className="flex justify-between items-start">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-text">{title}</h2>
        {description && (
          <p className="text-sm text-muted mt-1">{description}</p>
        )}
      </div>
      {showCloseButton && (
        <button
          onClick={onClose}
          className="text-muted2 hover:text-text transition-colors p-2 rounded-lg hover:bg-panel2 -mr-2 -mt-1"
          aria-label="Fechar"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );

  // ── Build modal JSX ──────────────────────────────────────────────────

  let modalContent: ReactNode;

  // ── Sticky footer mode: flex column with scrollable content ──
  if (stickyFooter) {
    const heightClass = fullHeight
      ? 'h-[calc(100dvh-2rem)]'
      : 'max-h-[calc(100dvh-2rem)] sm:max-h-[90vh]';
    const overlayPy = fullHeight ? 'py-4' : 'py-4 sm:py-8';

    modalContent = (
      <div
        className={`fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-sm px-3 sm:px-4 ${overlayPy}`}
        onClick={onClose}
      >
        <div
          className={`${sizes[size]} w-full ${heightClass} flex flex-col bg-panel border border-stroke rounded-2xl overflow-hidden`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {/* Fixed Header */}
          <div className="shrink-0 px-4 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4 border-b border-stroke/50">
            {header}
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-6 md:py-5">
            {children}
          </div>

          {/* Sticky Footer */}
          <div className="shrink-0 px-4 py-3 md:px-6 md:py-4 border-t border-stroke bg-panel">
            {stickyFooter}
          </div>
        </div>
      </div>
    );
  } else {
    // ── Default mode: scrollable overlay (backwards compatible) ──
    modalContent = (
      <div
        className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto py-8"
        onClick={onClose}
      >
        <div
          className={`${sizes[size]} w-full`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <div className="bg-panel border border-stroke rounded-2xl p-4 md:p-6">
            {/* Header */}
            <div className="mb-4">
              {header}
            </div>

            {/* Content */}
            <div className="mb-4">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-stroke">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render via portal to escape any ancestor stacking contexts
  return createPortal(modalContent, document.body);
}
