import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  marketingPanel?: React.ReactNode;
  showMarketing?: boolean;
}

export function AuthLayout({ children, marketingPanel, showMarketing = true }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-bg flex">
      {/* Marketing Panel (esquerda) - apenas desktop */}
      {showMarketing && marketingPanel && (
        <div className="hidden lg:block lg:w-[45%] px-6 xl:px-10 border-r border-border bg-gradient-to-br from-surface1/50 to-transparent">
          {marketingPanel}
        </div>
      )}

      {/* Form Panel (direita) */}
      <div className={`flex-1 flex items-center justify-center px-6 lg:px-8 py-12 ${showMarketing ? 'lg:w-[55%]' : 'w-full'}`}>
        <div className="w-full max-w-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
