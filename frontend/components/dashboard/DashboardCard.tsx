'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/shared/ui';

interface DashboardCardProps {
  title: string;
  icon?: ReactNode;
  href?: string;
  hrefLabel?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** Card premium reutilizável para os blocos do dashboard (cabeçalho + "ver tudo"). */
export function DashboardCard({
  title,
  icon,
  href,
  hrefLabel = 'ver tudo',
  children,
  className = '',
  bodyClassName = '',
}: DashboardCardProps) {
  return (
    <Card premium className={`flex h-full flex-col !p-0 ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-stroke px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold">
              {icon}
            </span>
          )}
          <h3 className="truncate text-sm font-bold text-text">{title}</h3>
        </div>
        {href && (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted2 transition-colors hover:text-gold"
          >
            {hrefLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className={`flex-1 p-4 ${bodyClassName}`}>{children}</div>
    </Card>
  );
}
