'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { usePermissions } from '@/hooks/usePermissions';
import { useMobileMenu } from '@/hooks/useMobileMenu';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { MobileMenu } from '@/components/layout/MobileMenu';
import {
  Menu,
  ChevronDown,
  LayoutDashboard,
  Users,
  Trophy,
  Calendar,
  BarChart3,
  Bell,
  User,
  Shield,
} from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',    href: '/dashboard',        icon: LayoutDashboard },
  { label: 'Times',        href: '/teams',            icon: Users },
  { label: 'Campeonatos',  href: '/championships',    icon: Trophy },
  { label: 'Partidas',     href: '/matches',          icon: Calendar },
  { label: 'Estatísticas', href: '/statistics',       icon: BarChart3 },
  { label: 'Notificações', href: '/notifications',    icon: Bell },
  { label: 'Perfil',       href: '/profile',          icon: User },
  { label: 'Admin',        href: '/admin',            icon: Shield,        adminOnly: true },
];

function isLinkActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { canManageChampionships } = usePermissions();
  const { toggle: toggleMobile } = useMobileMenu();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [userMenuOpen]);

  // Close user menu on route change
  useEffect(() => {
    setUserMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    queryClient.clear();
    router.push('/');
  };

  if (!user) return null;

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || canManageChampionships
  );

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-surface1/95 backdrop-blur-md">
        <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-4 lg:px-6">

          {/* LEFT: Hamburger (mobile) + Logo */}
          <div className="flex shrink-0 items-center gap-3">
            <button
              onClick={toggleMobile}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-surface2 hover:text-text lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link
              href="/dashboard"
              className="group flex items-center gap-2.5"
            >
              <Image
                src="/logo-imperium.png"
                alt="Imperium Logo"
                width={36}
                height={36}
                className="rounded-full transition-transform group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="text-lg font-bold tracking-wide text-gold font-heading">
                IMPERIUM
              </span>
            </Link>

            {/* Separator between logo and nav */}
            <div className="mx-1 hidden h-6 w-px bg-border/50 lg:block" />
          </div>

          {/* CENTER: Nav links (desktop only) */}
          <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {visibleItems.map((item) => {
              const active = isLinkActive(pathname, item.href, item.exact);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    group relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium
                    transition-all duration-200
                    ${active
                      ? 'text-gold'
                      : 'text-muted hover:bg-white/5 hover:text-text'
                    }
                  `}
                >
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      active ? 'text-gold' : 'text-muted/70 group-hover:text-text'
                    }`}
                  />
                  <span>{item.label}</span>

                  {item.adminOnly && (
                    <span className="ml-0.5 rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-gold">
                      ADM
                    </span>
                  )}

                  {/* Active indicator — gold bottom line */}
                  {active && (
                    <span className="absolute -bottom-[13px] left-3 right-3 h-[2px] rounded-full bg-gradient-to-r from-gold/30 via-gold to-gold/30" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* RIGHT: Search, Notifications, User */}
          <div className="flex shrink-0 items-center gap-2 lg:gap-3">
            <GlobalSearch />
            <NotificationBell />

            {/* User dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={`
                  flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all duration-200
                  hover:bg-surface2 lg:gap-2.5 lg:px-3
                  ${userMenuOpen ? 'bg-surface2' : ''}
                `}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gold3 to-gold2 text-xs font-bold text-black">
                  {user.first_name?.[0] || ''}
                  {user.last_name?.[0] || ''}
                </div>
                <div className="hidden text-left xl:block">
                  <p className="text-sm font-medium leading-tight text-text">
                    {user.full_name}
                  </p>
                  <p className="text-[11px] leading-tight text-muted">
                    {user.user_type_display}
                  </p>
                </div>
                <ChevronDown
                  className={`hidden h-3.5 w-3.5 text-muted transition-transform duration-200 xl:block ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-surface1 shadow-2xl shadow-black/30 animate-reveal">
                  {/* User info header */}
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-semibold text-text">{user.full_name}</p>
                    <p className="text-xs text-muted">{user.email}</p>
                  </div>

                  <div className="p-1.5">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        router.push('/profile');
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text transition-colors hover:bg-surface2"
                    >
                      <User className="h-4 w-4 text-muted" />
                      Meu Perfil
                    </button>

                    <div className="my-1 border-t border-border/50" />

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                      </svg>
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu (slide-down) */}
      <MobileMenu items={visibleItems} />
    </>
  );
}
