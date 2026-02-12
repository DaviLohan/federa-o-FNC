'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  color: 'cyan' | 'lime' | 'teal' | 'green';
  loading?: boolean;
  href?: string;
  trend?: { value: number; isPositive: boolean };
}

const colorClasses = {
  cyan: 'bg-gold/10 text-gold',
  lime: 'bg-warning/10 text-warning',
  teal: 'bg-gold/10 text-gold',
  green: 'bg-green/10 text-green',
};

const shadowClasses = {
  cyan: 'hover:shadow-gold/10',
  lime: 'hover:shadow-lime/10',
  teal: 'hover:shadow-teal/10',
  green: 'hover:shadow-green/10',
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  color,
  loading = false,
  href,
  trend,
}: KpiCardProps) {
  const content = (
    <div
      className={`
        group relative overflow-hidden rounded-xl border border-border
        bg-surface1 p-6 transition-all duration-300
        hover:-translate-y-1 hover:shadow-lg ${shadowClasses[color]}
        ${href ? 'cursor-pointer' : ''}
      `}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className={`rounded-lg p-3 ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              trend.isPositive ? 'text-green' : 'text-red-500'
            }`}
          >
            {trend.isPositive ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-2">
        {loading ? (
          <div className="h-10 w-24 animate-pulse rounded bg-surface2" />
        ) : (
          <h3 className="font-mono text-4xl font-bold text-text">
            {value}
          </h3>
        )}
      </div>

      {/* Title and Subtitle */}
      <div>
        <p className="text-sm font-medium text-muted">{title}</p>
        <p className="text-xs text-muted/70">{subtitle}</p>
      </div>

      {/* Hover effect */}
      {href && (
        <div className="absolute inset-0 border border-transparent group-hover:border-white/5" />
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
