'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const OPTIONS = [
  { href: '/login', label: 'Entrar' },
  { href: '/register', label: 'Cadastrar' },
];

/**
 * Controle segmentado que alterna entre as telas de login e cadastro.
 * Mantém as rotas separadas (o cadastro é um assistente de 2 etapas),
 * deixando claro em qual fluxo o usuário está.
 */
export function AuthToggle() {
  const pathname = usePathname();

  // Auto-contido: só aparece nas telas de auth (não na landing, onde o
  // RegisterForm também é reusado via FinalCTA).
  if (pathname !== '/login' && pathname !== '/register') return null;

  return (
    <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface2 p-1">
      {OPTIONS.map((opt) => {
        const active = pathname === opt.href;
        return (
          <Link
            key={opt.href}
            href={opt.href}
            aria-current={active ? 'page' : undefined}
            className={`
              rounded-md px-4 py-2 text-center text-sm font-medium transition-colors duration-200
              ${active
                ? 'bg-gold/10 text-gold shadow-sm'
                : 'text-muted hover:text-text'
              }
            `}
          >
            {opt.label}
          </Link>
        );
      })}
    </div>
  );
}
