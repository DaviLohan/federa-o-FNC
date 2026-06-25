'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

type Accent = 'gold' | 'warning' | 'green' | 'brand' | 'error';

interface KpiTrendCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  sublabel?: string | null;
  accent?: Accent;
  /** Variação absoluta vs. ciclo anterior (já calculada no backend). */
  delta?: number | null;
  /** Texto pequeno descrevendo o delta, ex: "vs. ciclo anterior". */
  deltaLabel?: string;
  /** Se subir é positivo (verde) ou não. Default: true. */
  higherIsBetter?: boolean;
  index?: number;
}

const accentConfig: Record<Accent, { value: string; icon: string; border: string }> = {
  gold: { value: 'text-gold', icon: 'bg-gold/10 border-gold/20', border: 'border-l-gold/60' },
  warning: { value: 'text-warning', icon: 'bg-warning/10 border-warning/20', border: 'border-l-warning/60' },
  green: { value: 'text-green', icon: 'bg-green/10 border-green/20', border: 'border-l-green/60' },
  brand: { value: 'text-brand', icon: 'bg-brand/10 border-brand/20', border: 'border-l-brand/60' },
  error: { value: 'text-error', icon: 'bg-error/10 border-error/20', border: 'border-l-error/60' },
};

function DeltaPill({ delta, higherIsBetter }: { delta: number; higherIsBetter: boolean }) {
  const isFlat = Math.abs(delta) < 0.005;
  const isPositive = delta > 0;
  const good = isFlat ? null : isPositive === higherIsBetter;
  const cls = isFlat
    ? 'border-stroke bg-panel2/60 text-muted2'
    : good
      ? 'border-green/30 bg-green/10 text-green'
      : 'border-error/30 bg-error/10 text-error';
  const Icon = isFlat ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;
  const formatted = Number.isInteger(delta) ? Math.abs(delta) : Math.abs(delta).toFixed(2);
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${cls}`}>
      <Icon className="h-3 w-3" />
      {isFlat ? '0' : formatted}
    </span>
  );
}

export function KpiTrendCard({
  icon, value, label, sublabel, accent = 'gold',
  delta, deltaLabel = 'vs. ciclo anterior', higherIsBetter = true, index = 0,
}: KpiTrendCardProps) {
  const cfg = accentConfig[accent];
  const hasDelta = delta !== null && delta !== undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-2xl border border-stroke bg-panel border-l-4 ${cfg.border} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20`}
    >
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      <div className="flex items-start gap-3 p-4 md:p-5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${cfg.icon}`}>
          <span className={`flex h-5 w-5 items-center justify-center ${cfg.value}`} aria-hidden>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className={`truncate font-mono text-xl font-bold leading-none md:text-2xl ${cfg.value}`}>{value}</div>
            {hasDelta && <DeltaPill delta={delta as number} higherIsBetter={higherIsBetter} />}
          </div>
          <div className="mt-1.5 text-xs font-medium text-muted2">{label}</div>
          {sublabel ? (
            <div className="mt-0.5 truncate text-xs font-semibold text-text">{sublabel}</div>
          ) : hasDelta ? (
            <div className="mt-0.5 text-[10px] text-muted2/80">{deltaLabel}</div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
