import type { ReactElement } from 'react';
import { Award, Crown, Gem, Shield, Diamond, Sparkles } from 'lucide-react';
import type { CompetitiveMyRankingPayload, PlayerTier } from '@/types';

const flow: PlayerTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'ELITE'];

const tierLabel: Record<PlayerTier, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Prata',
  GOLD: 'Ouro',
  PLATINUM: 'Platina',
  DIAMOND: 'Diamante',
  ELITE: 'Elite',
};

const tierIcon: Record<PlayerTier, ReactElement> = {
  BRONZE: <Shield className="h-4 w-4" />,
  SILVER: <Award className="h-4 w-4" />,
  GOLD: <Crown className="h-4 w-4" />,
  PLATINUM: <Gem className="h-4 w-4" />,
  DIAMOND: <Diamond className="h-4 w-4" />,
  ELITE: <Sparkles className="h-4 w-4" />,
};

// Largura da faixa de cada tier (próximo limiar − limiar atual), p/ progresso.
const tierBandWidth: Record<PlayerTier, number> = {
  BRONZE: 34,
  SILVER: 14,
  GOLD: 10,
  PLATINUM: 10,
  DIAMOND: 10,
  ELITE: 0,
};

interface RoadToPlatinaProps {
  me: CompetitiveMyRankingPayload;
}

function calcProgress(me: CompetitiveMyRankingPayload): number {
  if (me.currentTier === 'ELITE') return 100;
  const band = tierBandWidth[me.currentTier] || 1;
  const remaining = me.pointsToPromotion ?? band;
  return Math.max(0, Math.min(100, Math.round(((band - remaining) / band) * 100)));
}

export function RoadToPlatina({ me }: RoadToPlatinaProps) {
  const currentIdx = flow.indexOf(me.currentTier);
  const progress = calcProgress(me);

  return (
    <section className="rounded-2xl border border-stroke bg-panel p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-brand">Road to Elite</p>
          <h3 className="mt-1 text-lg font-bold text-text">Sua jornada competitiva</h3>
        </div>
        <span className="rounded-full border border-stroke bg-panel2/60 px-2.5 py-1 text-[11px] text-muted2">
          Próximo: {me.nextTier ? tierLabel[me.nextTier] : 'Rank máximo'}
        </span>
      </header>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
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
          <span>Progresso até o próximo rank</span>
          <span className="font-mono text-text">{progress}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full border border-stroke bg-panel2/60">
          <div
            className="h-full bg-gradient-to-r from-brand via-gold to-brand transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted2">
          {me.currentTier === 'ELITE'
            ? 'Você está no rank máximo da plataforma.'
            : `Faltam ${(me.pointsToPromotion ?? 0).toFixed(1)} pontos de Rank Score para ${me.nextTier ? tierLabel[me.nextTier] : 'o próximo rank'}.`}
        </p>
      </div>
    </section>
  );
}
