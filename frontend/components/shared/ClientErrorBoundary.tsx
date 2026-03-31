'use client';

import React from 'react';

interface ClientErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ClientErrorBoundaryState {
  hasError: boolean;
}

export class ClientErrorBoundary extends React.Component<ClientErrorBoundaryProps, ClientErrorBoundaryState> {
  constructor(props: ClientErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ClientErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ClientErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }

    return this.props.children;
  }
}
