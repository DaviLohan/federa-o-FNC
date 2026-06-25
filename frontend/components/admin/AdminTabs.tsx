'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Trophy,
  Shield,
  Users,
  Calendar,
  ClipboardList,
  ArrowLeft,
} from 'lucide-react';

const tabs = [
  { label: 'Dashboard',    href: '/admin',              icon: LayoutDashboard, exact: true },
  { label: 'Campeonatos',  href: '/admin/campeonatos',  icon: Trophy },
  { label: 'Times',        href: '/admin/times',        icon: Shield },
  { label: 'Jogadores',    href: '/admin/jogadores',    icon: Users },
  { label: 'Partidas',     href: '/admin/partidas',     icon: Calendar },
  { label: 'Inscrições',   href: '/admin/inscricoes',   icon: ClipboardList },
];

export function AdminTabs() {
  const pathname = usePathname();

  const isActive = (tab: (typeof tabs)[number]) =>
    tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);

  return (
    <div className="border-b border-border bg-surface1/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1600px] items-center gap-1 px-4 lg:px-6">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="mr-2 flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-muted transition-colors hover:bg-white/5 hover:text-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Voltar</span>
        </Link>

        {/* Separator */}
        <div className="mr-2 h-5 w-px bg-border/60" />

        {/* Tab links */}
        <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const active = isActive(tab);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`
                  group relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium
                  transition-all duration-200
                  ${active
                    ? 'bg-gold/10 text-gold shadow-sm shadow-gold/5'
                    : 'text-muted hover:bg-white/5 hover:text-text'
                  }
                `}
              >
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    active ? 'text-gold' : 'text-muted/70 group-hover:text-text'
                  }`}
                />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Admin badge — pushed to the right */}
        <div className="ml-auto hidden shrink-0 items-center gap-1.5 sm:flex">
          <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">
            <Shield className="h-3 w-3" />
            Admin
          </span>
        </div>
      </div>
    </div>
  );
}
