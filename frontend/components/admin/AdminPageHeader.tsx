import React from 'react';

interface AdminPageHeaderProps {
  /** Gold uppercase eyebrow above the title. Defaults to the section's context. */
  eyebrow?: string;
  title: string;
  /** Free-form subtitle below the title (takes precedence over count). */
  subtitle?: React.ReactNode;
  /** Numeric count rendered in mono before `countLabel` (e.g. 42 "campeonatos"). */
  count?: number;
  countLabel?: string;
  /** Right-aligned slot for actions (buttons, status pills, etc.). */
  actions?: React.ReactNode;
}

/**
 * Standard header for admin pages — gold eyebrow + title + optional count,
 * mirroring the `/admin` dashboard so every admin screen reads as one system.
 */
export function AdminPageHeader({
  eyebrow = 'Painel Administrativo',
  title,
  subtitle,
  count,
  countLabel,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gold">{eyebrow}</p>
        <h1 className="text-2xl font-bold text-text lg:text-3xl">{title}</h1>
        {subtitle != null ? (
          <p className="mt-1 text-muted">{subtitle}</p>
        ) : count != null ? (
          <p className="mt-1 text-sm text-muted">
            <span className="font-mono font-semibold text-text">{count}</span>
            {countLabel ? ` ${countLabel}` : ''}
          </p>
        ) : null}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
