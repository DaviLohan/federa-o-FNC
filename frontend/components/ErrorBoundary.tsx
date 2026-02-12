'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg px-4">
          <div className="max-w-md w-full text-center p-8 bg-surface1 border border-border rounded-2xl">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto bg-error/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h1 className="text-3xl font-bold text-error mb-2">
                Algo deu errado
              </h1>
              <p className="text-muted text-sm">
                Ocorreu um erro inesperado na aplicação
              </p>
            </div>
            
            {this.state.error && (
              <div className="mb-6 p-4 bg-bg rounded-xl text-left">
                <p className="text-xs text-muted2 font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            
            <button
              onClick={() => window.location.reload()}
              className="bg-gold text-black px-6 py-3 rounded-xl font-semibold hover:bg-gold2 transition-all duration-300 w-full"
            >
              Recarregar página
            </button>
            
            <button
              onClick={() => window.location.href = '/'}
              className="mt-3 text-muted hover:text-text text-sm transition-colors"
            >
              Voltar para home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
