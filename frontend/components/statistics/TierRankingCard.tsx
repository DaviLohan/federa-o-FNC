import type { CompetitiveRankingPlayerRow, PlayerTier } from '@/types';
import { TierPlayerItem } from './TierPlayerItem';
import { getTierStyle, tierRgba } from './tierStyles';

interface TierRankingCardProps {
  title: string;
  tier: PlayerTier;
  rows: CompetitiveRankingPlayerRow[];
}

const tierDescription: Record<PlayerTier, string> = {
  BRONZE: 'Faixa de entrada (0–33 pts).',
  SILVER: 'Em evolução (34–47 pts).',
  GOLD: 'Bom desempenho (48–57 pts).',
  PLATINUM: 'Alto nível (58–67 pts).',
  DIAMOND: 'Elite competitiva (68–77 pts).',
  ELITE: 'Topo da plataforma (78+ pts).',
};

export function TierRankingCard({ tier, rows }: TierRankingCardProps) {
  const s = getTierStyle(tier);
  const Icon = s.icon;

  return (
    <section
      className="overflow-hidden rounded-2xl border bg-panel"
      style={{ borderColor: tierRgba(s.solid, 0.28) }}
    >
      {/* Header premium da divisão */}
      <header
        className={`relative flex items-center justify-between gap-3 border-b bg-gradient-to-r ${s.headerGradient} px-4 py-3`}
        style={{ borderColor: tierRgba(s.solid, 0.18) }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border"
            style={{ color: s.solid, borderColor: tierRgba(s.solid, 0.4), background: tierRgba(s.solid, 0.12) }}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold md:text-base" style={{ color: s.solid }}>{s.label}</h3>
            <p className="text-[11px] text-muted2">{tierDescription[tier]}</p>
          </div>
        </div>
        <span
          className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[11px]"
          style={{ color: s.solid, borderColor: tierRgba(s.solid, 0.3), background: tierRgba(s.solid, 0.08) }}
        >
          {rows.length}
        </span>
      </header>

      <div className="space-y-1.5 p-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stroke/60 bg-panel2/30 p-4 text-center text-xs text-muted2">
            Sem jogadores neste rank no momento.
          </div>
        ) : (
          rows.map((row) => <TierPlayerItem key={row.playerId} row={row} tier={tier} />)
        )}
      </div>
    </section>
  );
}
