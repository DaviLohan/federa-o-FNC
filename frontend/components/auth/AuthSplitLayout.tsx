import React from 'react';

interface AuthSplitLayoutProps {
  branding: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Layout corporativo dividido para login/cadastro, na identidade do projeto
 * (carbono + dourado): card grande sobre o fundo escuro, esquerda de branding
 * (mais profunda) e direita com o formulário (carbono). No mobile, a coluna
 * esquerda é escondida e o formulário ocupa a tela.
 */
export function AuthSplitLayout({ branding, children }: AuthSplitLayoutProps) {
  return (
    <div className="flex min-h-screen w-full items-stretch justify-center bg-bg sm:items-center sm:p-6 lg:p-8">
      <div className="flex w-full max-w-5xl overflow-hidden bg-surface1 shadow-2xl shadow-black/40 sm:min-h-[640px] sm:rounded-2xl sm:border sm:border-border">
        {/* Esquerda — branding (desktop) */}
        <div className="hidden lg:flex lg:w-[45%]">{branding}</div>

        {/* Direita — formulário */}
        <div className="flex w-full items-center justify-center bg-surface1 px-5 py-10 sm:px-10 lg:w-[55%] lg:border-l lg:border-border">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </div>
    </div>
  );
}
