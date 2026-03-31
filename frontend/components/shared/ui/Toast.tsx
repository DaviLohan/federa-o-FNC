'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
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

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const getToastStyles = (type: ToastType) => {
    const baseStyles = 'px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-lg backdrop-blur-sm border flex items-start space-x-3 w-full sm:w-auto sm:min-w-[320px] max-w-md';
    
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
      
      {/* Toast Container */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex flex-col space-y-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${getToastStyles(toast.type)} pointer-events-auto animate-slide-in-bottom`}
            onClick={() => removeToast(toast.id)}
            role="alert"
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
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
