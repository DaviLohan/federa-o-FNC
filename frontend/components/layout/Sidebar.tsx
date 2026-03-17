'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import Image from 'next/image';
import { useSidebar } from '@/hooks/useSidebar';
import { usePermissions } from '@/hooks/usePermissions';
import {
  LayoutDashboard,
  Users,
  Trophy,
  Calendar,
  CalendarClock,
  BarChart3,
  Bell,
  ShieldAlert,
  User,
  Shield,
  X,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  exact?: boolean;
}

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();
  const { canManageChampionships } = usePermissions();

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Times', href: '/teams', icon: <Users className="h-5 w-5" /> },
    { label: 'Campeonatos', href: '/championships', icon: <Trophy className="h-5 w-5" /> },
    { label: 'Partidas', href: '/matches', icon: <Calendar className="h-5 w-5" />, exact: true },
    { label: 'Agendamento', href: '/matches/schedule', icon: <CalendarClock className="h-5 w-5" /> },
    { label: 'Estatísticas', href: '/statistics', icon: <BarChart3 className="h-5 w-5" /> },
    { label: 'Notificações', href: '/notifications', icon: <Bell className="h-5 w-5" /> },
    { label: 'Penalidades', href: '/penalties', icon: <ShieldAlert className="h-5 w-5" /> },
    { label: 'Perfil', href: '/profile', icon: <User className="h-5 w-5" /> },
  ];

  // Adicionar item Admin se for ADMIN ou SUPERVISOR
  if (canManageChampionships) {
    navItems.push({
      label: 'Admin',
      href: '/admin',
      icon: <Shield className="h-5 w-5" />,
      adminOnly: true,
    });
  }

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed left-0 top-0 z-50 h-screen w-64 border-r border-border bg-surface1
        transition-transform duration-300 ease-in-out
        lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/dashboard" className="flex items-center gap-3 group">
          <Image 
            src="/logo-imperium.png" 
            alt="Imperium Logo" 
            width={40} 
            height={40}
            className="rounded-lg"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
            <span className="text-xl font-bold text-gold">IMPERIUM</span>
          </Link>

          {/* Close button (mobile only) */}
          <button
            onClick={close}
            className="rounded-lg p-1 text-muted hover:bg-surface2 hover:text-text lg:hidden"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => close()}
                className={`
                  group relative flex items-center space-x-3 rounded-xl px-4 py-3
                  transition-all duration-200
                  ${
                    isActive
                      ? 'bg-white/6 text-text font-semibold'
                      : 'text-muted hover:bg-white/3 hover:text-gold2'
                  }
                `}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 h-8 w-1 rounded-r-full bg-gold" />
                )}

                {/* Icon */}
                <div
                  className={`
                  ${isActive ? 'text-gold' : 'text-muted group-hover:text-gold2'}
                  transition-colors
                `}
                >
                  {item.icon}
                </div>

                {/* Label */}
                <span className="flex-1">{item.label}</span>

                {/* Admin badge */}
                {item.adminOnly && (
                  <span className="rounded-full bg-gold text-black px-2 py-0.5 text-xs font-bold">
                    Admin
                  </span>
                )}

                {/* Hover effect */}
                {!isActive && (
                  <div className="absolute inset-0 rounded-xl opacity-0 transition-opacity group-hover:opacity-100 group-hover:bg-gold/5" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-surface2 p-4">
          <div className="text-xs text-muted">
            <p className="mb-1 font-semibold text-text">IMPERIUM Esports</p>
            <p>EA SPORTS FC Pro Clubs</p>
            <p className="mt-2 text-muted/70">v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
