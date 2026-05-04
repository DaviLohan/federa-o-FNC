'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Z_INDEX } from '@/lib/ui/z-index';

type ToastType = 'success' | 'error' | 'info' | 'warning';

const TOAST_DURATION_MS = 5000;
const TOAST_EXIT_MS = 250;

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  isClosing: boolean;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  const closeTimeoutsRef = useRef<Map<string, number>>(new Map());
  const removeTimeoutsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    setMounted(true);

    return () => {
      closeTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      removeTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      closeTimeoutsRef.current.clear();
      removeTimeoutsRef.current.clear();
    };
  }, []);

  const clearToastTimers = useCallback((id: string) => {
    const closeTimeout = closeTimeoutsRef.current.get(id);
    if (closeTimeout) {
      window.clearTimeout(closeTimeout);
      closeTimeoutsRef.current.delete(id);
    }

    const removeTimeout = removeTimeoutsRef.current.get(id);
    if (removeTimeout) {
      window.clearTimeout(removeTimeout);
      removeTimeoutsRef.current.delete(id);
    }
  }, []);

  const finalizeToastRemoval = useCallback((id: string) => {
    clearToastTimers(id);
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, [clearToastTimers]);

  const scheduleToastRemoval = useCallback((id: string) => {
    clearToastTimers(id);

    const closeTimeout = window.setTimeout(() => {
      setToasts((prev) => prev.map((toast) => (
        toast.id === id ? { ...toast, isClosing: true } : toast
      )));
    }, TOAST_DURATION_MS - TOAST_EXIT_MS);

    const removeTimeout = window.setTimeout(() => {
      finalizeToastRemoval(id);
    }, TOAST_DURATION_MS);

    closeTimeoutsRef.current.set(id, closeTimeout);
    removeTimeoutsRef.current.set(id, removeTimeout);
  }, [clearToastTimers, finalizeToastRemoval]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setToasts((prev) => [...prev, { id, message, type, isClosing: false }]);
    scheduleToastRemoval(id);
  }, [scheduleToastRemoval]);

  const removeToast = useCallback((id: string) => {
    clearToastTimers(id);
    setToasts((prev) => prev.map((toast) => (
      toast.id === id ? { ...toast, isClosing: true } : toast
    )));

    const removeTimeout = window.setTimeout(() => {
      finalizeToastRemoval(id);
    }, TOAST_EXIT_MS);

    removeTimeoutsRef.current.set(id, removeTimeout);
  }, [clearToastTimers, finalizeToastRemoval]);

  const getToastStyles = (type: ToastType) => {
    const baseStyles = 'px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-lg backdrop-blur-sm border flex items-start space-x-3 w-full sm:w-auto sm:min-w-[320px] max-w-md shadow-black/30';
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-success/20 border-success/30 text-success`;
      case 'error':
        return `${baseStyles} bg-error/20 border-error/30 text-error`;
      case 'warning':
        return `${baseStyles} bg-warning/20 border-warning/30 text-warning`;
      case 'info':
      default:
        return `${baseStyles} bg-brand/20 border-brand/30 text-brand2`;
    }
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {mounted && createPortal(
        <div
          className="pointer-events-none fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-3 sm:inset-x-auto sm:right-6 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
          style={{ zIndex: Z_INDEX.toast }}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`${getToastStyles(toast.type)} pointer-events-auto ${toast.isClosing ? 'animate-slide-out-bottom' : 'animate-slide-in-bottom'}`}
              onClick={() => removeToast(toast.id)}
              role="alert"
              aria-live="polite"
            >
              <span className="text-2xl font-bold flex-shrink-0">{getIcon(toast.type)}</span>
              <div className="flex-1">
                <p className="text-sm font-medium leading-relaxed">{toast.message}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(toast.id);
                }}
                className="text-current opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
                aria-label="Fechar notificação"
              >
                ✕
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
