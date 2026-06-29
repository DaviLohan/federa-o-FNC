import { ArrowUpRight, Sparkles } from 'lucide-react';
import type { CompetitiveMyRankingPayload } from '@/types';
import { PromotionBadge } from './PromotionBadge';
import { RankBadge } from './RankBadge';

interface MyRankingStatusProps {
  me: CompetitiveMyRankingPayload;
}

export function MyRankingStatus({ me }: MyRankingStatusProps) {
  const isInZone = me.isPromotionZone;
  const points = me.pointsToPromotion ?? 0;
  const atMax = me.currentTier === 'ELITE';

  return (
    <section className="relative overflow-hidden rounded-2xl border border-stroke bg-gradient-to-br from-panel2/60 via-panel to-panel p-5">
      <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-brand/10 blur-3xl" aria-hidden />

      <header className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-brand">Minha Evolução</p>
          <h3 className="mt-1 text-lg font-bold text-text">{me.playerName}</h3>
          {me.teamName && <p className="text-xs text-muted2">{me.teamName}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <RankBadge tier={me.currentTier} size="md" />
          <PromotionBadge tier={me.currentTier} isPromotionZone={me.isPromotionZone} size="md" />
        </div>
      </header>

      <div className="relative mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Metric label="Rank Score" value={me.score.toFixed(1)} accent="text-gold" />
        <Metric label="Pos. geral" value={me.generalPosition ?? '—'} />
        <Metric label="Pos. no rank" value={me.tierPosition ?? '—'} />
        <Metric label="Nota média" value={me.averageRating.toFixed(2)} />
      </div>

      <div className="relative mt-3 grid grid-cols-3 gap-2">
        <Metric label="Gols" value={me.goals} />
        <Metric label="Assist." value={me.assists} />
        <Metric label="Jogos" value={me.matchesPlayed} />
      </div>

      <div className="relative mt-5 rounded-xl border border-stroke bg-panel2/40 p-4">
        {isInZone ? (
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-300/30 bg-emerald-400/10 text-emerald-200">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-text">Você está na zona de promoção.</p>
              <p className="text-xs text-muted2">Mantenha sua posição até o fechamento do ciclo para subir para {me.nextTier ?? 'o próximo rank'}.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand">
              <ArrowUpRight className="h-4 w-4" />
            </span>
            <div>
              {atMax ? (
                <p className="text-sm font-semibold text-text">Você está no rank máximo da plataforma.</p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-text">
                    Faltam <span className="font-mono text-text">{points.toFixed(1)}</span> pontos de Rank Score para {me.nextTier ?? 'o próximo rank'}.
                  </p>
                  <p className="text-xs text-muted2">
                    Suba seu Rank Score com boas atuações para alcançar {me.nextTier ?? 'o próximo rank'}.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="rounded-xl border border-stroke/60 bg-panel/60 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted2">{label}</p>
      <p className={`mt-1 font-mono text-lg font-bold leading-none ${accent ?? 'text-text'}`}>{value}</p>
    </div>
  );
}
