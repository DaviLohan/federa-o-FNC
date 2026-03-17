'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useSidebar } from '@/hooks/useSidebar';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Menu, ChevronDown } from 'lucide-react';
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Mapa de rotas → títulos exibidos no topo
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/teams': 'Times',
  '/championships': 'Campeonatos',
  '/matches': 'Partidas',
  '/matches/schedule': 'Agendamento',
  '/statistics': 'Estatísticas',
  '/notifications': 'Notificações',
  '/penalties': 'Penalidades',
  '/profile': 'Perfil',
  '/admin': 'Administração',
  '/invitations': 'Convites',
};

function getPageTitle(pathname: string): string {
  // Correspondência exata primeiro
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  // Correspondência por prefixo (ex: /matches/123 → "Partidas")
  for (const [route, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(route + '/')) return title;
  }
  return 'IMPERIUM';
}

export function Topbar() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { toggle } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    queryClient.clear(); // Limpa todo o cache do React Query para evitar dados da sessão anterior
    router.push('/');
  };

  if (!user) return null;

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface1 px-4 lg:px-6">
      {/* Left side - Hamburger + Title */}
      <div className="flex items-center space-x-4">
        {/* Hamburger Menu (mobile only) */}
        <button
          onClick={toggle}
          className="rounded-lg p-2 text-text transition-colors hover:bg-surface2 lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Page Title — dinâmico por rota */}
        <h1 className="text-sm font-semibold text-text sm:text-lg lg:text-xl">
          {getPageTitle(pathname)}
        </h1>
      </div>

      {/* Right side - Search + Notifications + User Menu */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* Global Search */}
        <GlobalSearch />

        {/* Notifications */}
        <NotificationBell />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center space-x-2 rounded-xl px-2 py-2 transition-colors hover:bg-surface2 lg:space-x-3 lg:px-4"
          >
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-text">{user.full_name}</p>
              <p className="text-xs text-muted">{user.user_type_display}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold3 to-gold2 text-sm font-bold text-black">
              {user.first_name?.[0] || ''}
              {user.last_name?.[0] || ''}
            </div>
            <ChevronDown
              className={`h-4 w-4 text-muted transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />

              {/* Menu */}
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface1 shadow-xl">
                <div className="p-2">
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      router.push('/profile');
                    }}
                    className="w-full rounded-lg px-4 py-2 text-left text-sm text-text transition-colors hover:bg-surface2"
                  >
                    👤 Meu Perfil
                  </button>
                  <div className="my-2 border-t border-border" />
                  <button
                    onClick={handleLogout}
                    className="w-full rounded-lg px-4 py-2 text-left text-sm text-red-500 transition-colors hover:bg-red-500/10"
                  >
                    🚪 Sair
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
