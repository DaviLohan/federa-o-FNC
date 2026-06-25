import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  /** Mantidos por compatibilidade com telas antigas; não têm mais efeito. */
  marketingPanel?: React.ReactNode;
  showMarketing?: boolean;
}

/**
 * Shell das telas de autenticação: coluna única centralizada sobre o fundo
 * carbono. Layout sóbrio (estilo painel SaaS), sem painéis de marketing.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full">{children}</div>
    </div>
  );
}
