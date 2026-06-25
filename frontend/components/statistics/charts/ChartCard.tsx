'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Container premium reutilizável para os gráficos da página de estatísticas. */
export function ChartCard({ title, subtitle, icon, action, children, className = '' }: ChartCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-2xl border border-stroke bg-panel ${className}`}
    >
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-text">{title}</h3>
            {subtitle && <p className="truncate text-xs text-muted2">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="px-3 pb-4 pt-3 md:px-5">{children}</div>
    </motion.section>
  );
}
