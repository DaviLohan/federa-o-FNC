'use client';

import { TrendingUp, ArrowUpRight } from 'lucide-react';
import type { CompetitiveMyRankingPayload } from '@/types';
import { DashboardCard } from './DashboardCard';
import { EmptyState, Skeleton } from '@/components/shared/ui';
import { getTierStyle } from '@/components/statistics/tierStyles';

export function MyRankCard({ myRank, loading }: { myRank?: CompetitiveMyRankingPayload; loading?: boolean }) {
  return (
    <DashboardCard title="Sua posição" icon={<TrendingUp className="h-4 w-4" />} href="/statistics" hrefLabel="evolução">
      {loading ? (
        <Skeleton height="180px" className="rounded-2xl" />
      ) : !myRank || myRank.matchesPlayed === 0 ? (
        <EmptyState icon="📈" size="sm" title="Sem ranking ainda" description="Jogue partidas válidas para entrar no ranking competitivo." />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted2">Posição geral</p>
              <p className="font-mono text-3xl font-black text-gold leading-none">
                {myRank.generalPosition != null ? `#${myRank.generalPosition}` : '—'}
              </p>
            </div>
            <span
              className="rounded-full border px-3 py-1 text-xs font-bold"
              style={{
                color: getTierStyle(myRank.currentTier).solid,
                borderColor: getTierStyle(myRank.currentTier).solid + '55',
                background: getTierStyle(myRank.currentTier).solid + '1a',
              }}
            >
              {getTierStyle(myRank.currentTier).label}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              ['Score', myRank.score.toFixed(1)],
              ['Nota', myRank.averageRating ? myRank.averageRating.toFixed(1) : '—'],
              ['Gols', String(myRank.goals)],
              ['Assist.', String(myRank.assists)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-panel2 px-2 py-1.5 text-center">
                <p className="font-mono text-sm font-bold text-text tabular-nums">{value}</p>
                <p className="text-[9px] uppercase tracking-wide text-muted2">{label}</p>
              </div>
            ))}
          </div>

          {myRank.isPromotionZone ? (
            <p className="flex items-center gap-1.5 rounded-xl border border-green/30 bg-green/10 px-3 py-2 text-xs font-semibold text-green">
              <ArrowUpRight className="h-4 w-4" /> Em zona de promoção!
            </p>
          ) : myRank.positionsToPromotion != null ? (
            <p className="rounded-xl border border-stroke bg-panel2 px-3 py-2 text-xs text-muted2">
              Faltam <span className="font-bold text-text">{myRank.positionsToPromotion}</span> posições para a promoção.
            </p>
          ) : null}
        </div>
      )}
    </DashboardCard>
  );
}
