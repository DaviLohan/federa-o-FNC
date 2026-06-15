import type { ReactElement } from 'react';
import { Award, Crown, Gem, Shield } from 'lucide-react';
import type { CompetitiveMyRankingPayload, PlayerTier } from '@/types';

const flow: PlayerTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

const tierLabel: Record<PlayerTier, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Prata',
  GOLD: 'Ouro',
  PLATINUM: 'Platina',
};

const tierIcon: Record<PlayerTier, ReactElement> = {
  BRONZE: <Shield className="h-4 w-4" />,
  SILVER: <Award className="h-4 w-4" />,
  GOLD: <Crown className="h-4 w-4" />,
  PLATINUM: <Gem className="h-4 w-4" />,
};

interface RoadToPlatinaProps {
  me: CompetitiveMyRankingPayload;
}

function calcProgress(me: CompetitiveMyRankingPayload): number {
  if (me.isPromotionZone) return 100;
  const tierIdx = flow.indexOf(me.currentTier);
  const baseByTier = [10, 30, 50, 90][tierIdx] ?? 10;
  const positions = me.positionsToPromotion ?? 0;
  if (positions <= 0) return Math.min(100, baseByTier + 20);
  if (positions <= 3) return Math.min(100, baseByTier + 18);
  if (positions <= 8) return Math.min(100, baseByTier + 12);
  return baseByTier;
}

export function RoadToPlatina({ me }: RoadToPlatinaProps) {
  const currentIdx = flow.indexOf(me.currentTier);
  const progress = calcProgress(me);

  return (
    <section className="rounded-2xl border border-stroke bg-panel p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-brand">Road to Platina</p>
          <h3 className="mt-1 text-lg font-bold text-text">Sua jornada competitiva</h3>
        </div>
        <span className="rounded-full border border-stroke bg-panel2/60 px-2.5 py-1 text-[11px] text-muted2">
          Próximo: {me.nextTier ? tierLabel[me.nextTier] : 'Elite máxima'}
        </span>
      </header>

      <div className="mt-5 grid grid-cols-4 gap-2">
        {flow.map((tier, idx) => {
          const isCurrent = idx === currentIdx;
          const isPast = idx < currentIdx;
          const isNext = idx === currentIdx + 1;
          const stateCls = isCurrent
            ? 'border-gold/50 bg-gold/10 text-text shadow-[0_0_30px_rgba(255,214,102,0.12)]'
            : isPast
            ? 'border-stroke/60 bg-panel2/40 text-muted2 opacity-70'
            : isNext
            ? 'border-brand/40 bg-brand/10 text-brand'
            : 'border-stroke bg-panel2/40 text-muted2';

          return (
            <div key={tier} className={`relative rounded-xl border p-3 text-center ${stateCls}`}>
              <span className="mx-auto mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-current/30 bg-current/10">
                {tierIcon[tier]}
              </span>
              <p className="text-[10px] uppercase tracking-wide opacity-80">{idx + 1}º</p>
              <p className="text-sm font-bold">{tierLabel[tier]}</p>
              {isCurrent && (
                <span className="mt-1.5 inline-block rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                  Aqui
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-muted2">
          <span>Progresso até a próxima promoção</span>
          <span className="font-mono text-text">{progress}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full border border-stroke bg-panel2/60">
          <div
            className="h-full bg-gradient-to-r from-brand via-gold to-brand transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted2">
          {me.isPromotionZone
            ? 'Você está na zona de promoção neste ciclo.'
            : `Faltam ${me.positionsToPromotion ?? 0} posições e ${(me.pointsToPromotion ?? 0).toFixed(2)} pontos para entrar no Top 5.`}
        </p>
      </div>
    </section>
  );
}
