import type { ReactElement } from 'react';
import { Award, Crown, Gem, Shield } from 'lucide-react';
import type { CompetitiveRankingPlayerRow, PlayerTier } from '@/types';
import { TierPlayerItem } from './TierPlayerItem';

interface TierRankingCardProps {
  title: string;
  tier: PlayerTier;
  rows: CompetitiveRankingPlayerRow[];
}

const tierConfig: Record<PlayerTier, { gradient: string; border: string; accent: string; icon: ReactElement; description: string }> = {
  BRONZE: {
    gradient: 'from-amber-700/15 via-panel to-panel',
    border: 'border-amber-500/30',
    accent: 'text-amber-300',
    icon: <Shield className="h-4 w-4" />,
    description: 'Jogadores em formação. Suba para Prata vencendo o ciclo.',
  },
  SILVER: {
    gradient: 'from-slate-300/10 via-panel to-panel',
    border: 'border-slate-300/30',
    accent: 'text-slate-200',
    icon: <Award className="h-4 w-4" />,
    description: 'Desempenho intermediário. Top 5 sobem para Ouro.',
  },
  GOLD: {
    gradient: 'from-yellow-300/15 via-panel to-panel',
    border: 'border-yellow-300/30',
    accent: 'text-yellow-200',
    icon: <Crown className="h-4 w-4" />,
    description: 'Alto desempenho. Top 5 sobem para Platina.',
  },
  PLATINUM: {
    gradient: 'from-cyan-500/15 via-panel to-panel',
    border: 'border-cyan-300/30',
    accent: 'text-cyan-200',
    icon: <Gem className="h-4 w-4" />,
    description: 'Elite competitiva da plataforma. Mantém posição.',
  },
};

export function TierRankingCard({ title, tier, rows }: TierRankingCardProps) {
  const cfg = tierConfig[tier];

  return (
    <section className={`overflow-hidden rounded-2xl border bg-gradient-to-br ${cfg.gradient} ${cfg.border}`}>
      <header className={`flex items-center justify-between border-b ${cfg.border} px-4 py-3`}>
        <div className="flex items-center gap-2">
          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-panel2/60 ${cfg.border} ${cfg.accent}`}>
            {cfg.icon}
          </span>
          <div>
            <h3 className="text-sm font-bold text-text md:text-base">{title}</h3>
            <p className="text-[11px] text-muted2">{cfg.description}</p>
          </div>
        </div>
        <span className="rounded-full border border-stroke bg-panel2/60 px-2 py-0.5 text-[11px] font-mono text-muted2">
          {rows.length} jogadores
        </span>
      </header>

      <div className="space-y-2 p-3 md:p-4">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stroke/60 bg-panel/40 p-4 text-center text-xs text-muted2">
            Sem jogadores neste rank no momento.
          </div>
        ) : (
          rows.map((row) => <TierPlayerItem key={row.playerId} row={row} tier={tier} />)
        )}
      </div>
    </section>
  );
}
