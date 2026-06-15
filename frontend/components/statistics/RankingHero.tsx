import { CalendarClock, Trophy } from 'lucide-react';

interface RankingHeroProps {
  cycleLabel?: string;
  isFallbackCycle?: boolean;
}

export function RankingHero({ cycleLabel, isFallbackCycle }: RankingHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-panel via-panel2/80 to-panel p-6 md:p-8">
      <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-brand/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-gold/10 blur-3xl" aria-hidden />

      <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            Central de Ranking
          </span>
          <h1 className="text-2xl font-bold leading-tight text-text md:text-4xl">
            Ranking Competitivo
          </h1>
          <p className="max-w-2xl text-sm text-muted2 md:text-base">
            Veja quem domina a competição, acompanhe sua evolução e lute pelo topo da elite Platina.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stroke bg-panel2/60 px-2.5 py-1 text-muted2">
              <CalendarClock className="h-3.5 w-3.5" />
              Ciclo {cycleLabel ?? '—'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-stroke bg-panel2/60 px-2.5 py-1 text-muted2">
              Promoção dia 01 às 00:05 (America/Sao_Paulo)
            </span>
            {isFallbackCycle && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-gold">
                Exibindo ranking do ciclo anterior até novas partidas no ciclo atual
              </span>
            )}
          </div>

          <p className="pt-2 text-[11px] text-muted2/80">
            Ranking calculado com base nos reportes oficiais das partidas.
          </p>
        </div>

        <div className="relative inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-brand/40 bg-brand/10 shadow-[0_0_60px_rgba(20,204,221,0.2)]">
          <Trophy className="h-8 w-8 text-brand" />
        </div>
      </div>
    </section>
  );
}
