'use client';

import { motion } from 'framer-motion';
import { Crown, Medal, Trophy } from 'lucide-react';
import type { CompetitiveRankingPlayerRow } from '@/types';
import { RankBadge } from './RankBadge';
import { PlayerAvatar } from './PlayerAvatar';
import { CompactStats } from './CompactStats';
import { MovementIndicator } from './MovementIndicator';

interface PodiumCardProps {
  player: CompetitiveRankingPlayerRow;
  emphasis: 'lead' | 'second' | 'third';
}

const medal = {
  lead: { color: '#F3D36B', label: '1º', icon: Crown, glow: 'rgba(243,211,107,0.22)' },
  second: { color: '#CBD5E1', label: '2º', icon: Medal, glow: 'rgba(203,213,225,0.14)' },
  third: { color: '#C9803E', label: '3º', icon: Trophy, glow: 'rgba(201,128,62,0.16)' },
};

export function PodiumCard({ player, emphasis }: PodiumCardProps) {
  const m = medal[emphasis];
  const Icon = m.icon;
  const isLead = emphasis === 'lead';

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className={`group relative overflow-hidden rounded-2xl border bg-panel p-4 text-center sm:p-5 ${isLead ? 'md:pb-6 md:pt-7' : ''}`}
      style={{
        borderColor: `${m.color}55`,
        boxShadow: isLead ? `0 0 50px ${m.glow}` : undefined,
        // estabelece contexto de container-query para o score se auto-ajustar à largura do card
        containerType: 'inline-size',
      }}
    >
      {/* glow superior na cor da medalha */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32"
        style={{ background: `radial-gradient(120% 100% at 50% 0%, ${m.glow}, transparent 70%)` }}
        aria-hidden
      />
      {/* faixa de medalha no topo */}
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${m.color}, transparent)` }} />

      {/* posição + movimento */}
      <div className="relative mb-3 flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs font-bold"
          style={{ color: m.color, borderColor: `${m.color}55`, background: `${m.color}1a` }}
        >
          <Icon className="h-3.5 w-3.5" />
          {m.label}
        </span>
        <MovementIndicator delta={player.positionDelta} size="md" showNew />
      </div>

      {/* avatar */}
      <div className="relative flex justify-center">
        <PlayerAvatar name={player.playerName} avatar={player.avatar} tier={player.tier} size={isLead ? 'xl' : 'lg'} />
      </div>

      {/* nome + time */}
      <h3 className={`mt-3 truncate font-bold text-text ${isLead ? 'text-lg' : 'text-base'}`}>{player.playerName}</h3>
      <p className="truncate text-xs text-muted2">{player.teamName}</p>

      {/* score gigante — escala com a largura do card (cqi) e nunca corta */}
      <div className="mt-3 flex w-full flex-col items-center">
        <span
          className={`block w-full truncate font-mono font-extrabold leading-none tabular-nums ${
            isLead ? 'text-[clamp(1.5rem,18cqi,2.75rem)]' : 'text-[clamp(1.25rem,15cqi,2.25rem)]'
          }`}
          style={{ color: m.color }}
        >
          {player.score.toFixed(2)}
        </span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted2">Score</span>
      </div>

      {/* badge divisão */}
      <div className="mt-3 flex justify-center">
        <RankBadge tier={player.tier} size="md" />
      </div>

      {/* stats compactas */}
      <CompactStats
        rating={player.averageRating}
        goals={player.goals}
        assists={player.assists}
        matches={player.matchesPlayed}
        variant="grid"
        className="mt-4"
      />
    </motion.article>
  );
}
