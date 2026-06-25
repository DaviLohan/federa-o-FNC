'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Instagram, Youtube } from 'lucide-react';
import { BrandLockup } from '@/components/branding/BrandLockup';

const APP_VERSION = 'v1.0.0';

const NAV_LINKS = [
  { label: 'Campeonatos', href: '/championships' },
  { label: 'Times', href: '/teams' },
  { label: 'Partidas', href: '/matches' },
  { label: 'Estatísticas', href: '/statistics' },
];

// Redes sociais — placeholders. Troque os href "#" pelas URLs reais quando tiver os perfis.
const SOCIALS = [
  { label: 'Instagram', href: '#', icon: <Instagram className="h-4 w-4" /> },
  { label: 'Discord', href: '#', icon: <DiscordIcon /> },
  { label: 'YouTube', href: '#', icon: <Youtube className="h-4 w-4" /> },
  { label: 'X (Twitter)', href: '#', icon: <XIcon /> },
];

function Dot() {
  return <span className="select-none text-white/15">·</span>;
}

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-16 border-t border-white/[0.06] bg-bg1/80">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(214,161,30,0.25)] to-transparent" />

      <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-4 py-10 text-center">
        {/* Marca */}
        <BrandLockup variant="navbar" href="/" />
        <p className="-mt-1 text-xs text-muted2">
          Plataforma de e-Sports — EA SPORTS FC Pro Clubs
        </p>

        {/* Navegação */}
        <nav aria-label="Rodapé" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded text-sm font-medium text-muted2 outline-none transition-colors hover:text-gold focus-visible:text-gold focus-visible:ring-2 focus-visible:ring-gold/30"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Redes sociais */}
        <div className="flex items-center gap-2">
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.02] text-muted2 outline-none transition-all hover:-translate-y-0.5 hover:border-gold/30 hover:bg-gold/10 hover:text-gold focus-visible:ring-2 focus-visible:ring-gold/30"
            >
              {s.icon}
            </a>
          ))}
        </div>

        {/* Divisória */}
        <div className="h-px w-full max-w-md bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Barra inferior */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] leading-none text-muted2">
          <span>© {year}</span>
          <Dot />
          <span className="font-heading font-semibold tracking-[0.02em] text-text/70">FDT ARENA</span>
          <Dot />
          <span className="font-mono text-[10px] tracking-[0.04em]">{APP_VERSION}</span>
          <Dot />
          <span className="inline-flex items-center gap-1.5">
            <span>feito por</span>
            <Image
              src="/branding/davi-lohan-logo.png"
              alt="Davi Lohan — Developer & Founder"
              width={520}
              height={265}
              className="h-6 w-auto opacity-90 transition-opacity hover:opacity-100"
            />
          </span>
        </div>
      </div>
    </footer>
  );
}

// ─── Ícones de marcas sem equivalente no lucide ──────────────────────────────

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.371-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.245.198.372.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028ZM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.42 0-1.332.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.418 0 1.334-.956 2.42-2.157 2.42Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.42 0-1.332.955-2.418 2.157-2.418 1.21 0 2.176 1.095 2.157 2.418 0 1.334-.946 2.42-2.157 2.42Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}
