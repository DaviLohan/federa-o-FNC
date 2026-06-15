import { BarChart3, Crown, Flag, Shield, Users } from 'lucide-react';
import type { CompetitiveRankingPayload } from '@/types';
import { StatKpiCard } from './StatKpiCard';

interface RankingSummaryCardsProps {
  data: CompetitiveRankingPayload;
}

export function RankingSummaryCards({ data }: RankingSummaryCardsProps) {
  const top = data.general[0];
  const teams = new Set(data.general.map((item) => item.teamName)).size;
  const eligible = data.general.filter((item) => item.isPromotionEligible).length;
  const matches = data.general.reduce((acc, item) => acc + item.matchesPlayed, 0);

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatKpiCard icon={<Users />} value={data.total_players} label="Jogadores ranqueados" accent="brand" />
      <StatKpiCard icon={<BarChart3 />} value={matches} label="Partidas analisadas" accent="green" />
      <StatKpiCard icon={<Crown />} value={top?.playerName ?? '—'} label="Melhor jogador" sublabel={top?.teamName ?? null} accent="gold" />
      <StatKpiCard icon={<Flag />} value={top ? top.score.toFixed(2) : '0.00'} label="Maior pontuação" accent="warning" />
      <StatKpiCard icon={<Shield />} value={teams} label="Times no ranking" sublabel={`${eligible} elegíveis p/ promoção`} accent="brand" />
    </section>
  );
}
