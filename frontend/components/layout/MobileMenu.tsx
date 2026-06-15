'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMobileMenu } from '@/hooks/useMobileMenu';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import type { NavItem } from '@/components/layout/Navbar';
import { Z_INDEX } from '@/lib/ui/z-index';

function isLinkActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

interface MobileMenuProps {
  items: NavItem[];
}

export function MobileMenu({ items }: MobileMenuProps) {
  const pathname = usePathname();
  const { isOpen, close } = useMobileMenu();

  // Close on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden
          ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}
        `}
        style={{ zIndex: Z_INDEX.mobileMenu }}
        onClick={close}
      />

      {/* Slide-down panel */}
      <div
        className={`
          fixed left-0 right-0 top-16 max-h-[calc(100vh-4rem)] overflow-y-auto
          border-b border-border bg-surface1/98 backdrop-blur-md
          transition-all duration-300 ease-out lg:hidden
          ${isOpen
            ? 'translate-y-0 opacity-100'
            : '-translate-y-4 pointer-events-none opacity-0'
          }
        `}
        style={{ zIndex: Z_INDEX.mobileMenu }}
      >
        {/* Close button */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Navegacao
          </span>
          <button
            onClick={close}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface2 hover:text-text"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="p-2">
          {items.map((item) => {
            const active = isLinkActive(pathname, item.href, item.exact);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`
                  group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium
                  transition-all duration-200
                  ${active
                    ? 'bg-gold/10 text-gold'
                    : 'text-muted hover:bg-white/5 hover:text-text'
                  }
                `}
              >
                {/* Active left bar */}
                {active && (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gold" />
                )}

                <Icon
                  className={`h-5 w-5 transition-colors ${
                    active ? 'text-gold' : 'text-muted group-hover:text-text'
                  }`}
                />

                <span className="flex-1">{item.label}</span>

                {item.adminOnly && (
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">
                    Admin
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border/50 px-4 py-3">
          <p className="text-[11px] text-muted/60">
            PRO ELEVEN Federation &middot; EA SPORTS FC Pro Clubs &middot; v1.0.0
          </p>
        </div>
      </div>
    </>
  );
}
