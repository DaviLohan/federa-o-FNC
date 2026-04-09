import type { ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StatKpiCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  sublabel?: string | null;
  /** Cor do valor e do accent lateral */
  accent?: 'gold' | 'warning' | 'green' | 'brand' | 'error';
}

// ─── Accent config ────────────────────────────────────────────────────────────

const accentConfig: Record<
  NonNullable<StatKpiCardProps['accent']>,
  { value: string; icon: string; border: string }
> = {
  gold:    { value: 'text-gold',    icon: 'bg-gold/10 border-gold/20',    border: 'border-l-gold/60' },
  warning: { value: 'text-warning', icon: 'bg-warning/10 border-warning/20', border: 'border-l-warning/60' },
  green:   { value: 'text-green',   icon: 'bg-green/10 border-green/20',  border: 'border-l-green/60' },
  brand:   { value: 'text-brand',   icon: 'bg-brand/10 border-brand/20',  border: 'border-l-brand/60' },
  error:   { value: 'text-error',   icon: 'bg-error/10 border-error/20',  border: 'border-l-error/60' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function StatKpiCard({
  icon,
  value,
  label,
  sublabel,
  accent = 'gold',
}: StatKpiCardProps) {
  const cfg = accentConfig[accent];

  return (
    <div
      className={`
        relative bg-panel border border-stroke rounded-2xl overflow-hidden
        border-l-4 ${cfg.border}
        transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20
      `}
    >
      {/* Gradiente topo */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      <div className="p-4 md:p-5 flex items-center gap-4">
        {/* Ícone */}
        <div
          className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${cfg.icon}`}
        >
          <span className={`w-5 h-5 ${cfg.value}`}>{icon}</span>
        </div>

        {/* Conteúdo */}
        <div className="min-w-0">
          <div className={`text-xl md:text-2xl font-mono font-bold leading-none ${cfg.value}`}>
            {value}
          </div>
          <div className="text-xs text-muted2 mt-1 font-medium">{label}</div>
          {sublabel && (
            <div className="text-xs text-text font-semibold mt-0.5 truncate">
              {sublabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
