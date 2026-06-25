import type { ReactNode } from 'react';
import { CalendarClock, Info, Trophy } from 'lucide-react';

interface RankingHeroProps {
  cycleLabel?: string;
  isFallbackCycle?: boolean;
  /** Slot à direita — ex.: seletor de período. */
  action?: ReactNode;
}

export function RankingHero({ cycleLabel, isFallbackCycle, action }: RankingHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-panel via-panel2/80 to-panel p-5 md:p-6">
      <div className="pointer-events-none absolute -top-20 -right-16 h-44 w-44 rounded-full bg-brand/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-gold/10 blur-3xl" aria-hidden />

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="relative hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-brand/40 bg-brand/10 shadow-[0_0_40px_rgba(214,161,30,0.18)] sm:flex">
            <Trophy className="h-6 w-6 text-brand" />
          </div>
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              Central de Ranking
            </span>
            <h1 className="text-xl font-bold leading-tight text-text md:text-2xl">Ranking Competitivo</h1>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted2">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                Ciclo {cycleLabel ?? '—'}
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-muted2/40 sm:inline-block" />
              <span className="inline-flex items-center gap-1">
                <Info className="h-3.5 w-3.5" />
                Baseado nos reportes oficiais das partidas
              </span>
            </p>
          </div>
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {isFallbackCycle && (
        <p className="relative mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/10 px-2.5 py-1 text-[11px] text-gold">
          Exibindo o ranking do ciclo anterior até novas partidas no ciclo atual.
        </p>
      )}
    </section>
  );
}
