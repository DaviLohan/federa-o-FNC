'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Crown, Star, Target, Handshake, Users, TrendingUp, TrendingDown, ShieldCheck,
} from 'lucide-react';
import type { CompetitiveRankingPlayerRow, RankingComparison } from '@/types';

interface Props {
  rows: CompetitiveRankingPlayerRow[];
  comparison?: RankingComparison | null;
}

type Tone = 'gold' | 'green' | 'brand' | 'error' | 'neutral';

interface Insight {
  icon: ReactNode;
  title: string;
  value: string;
  hint?: string;
  tone: Tone;
}

const toneMap: Record<Tone, { icon: string; value: string }> = {
  gold: { icon: 'bg-gold/10 border-gold/20 text-gold', value: 'text-gold' },
  green: { icon: 'bg-green/10 border-green/20 text-green', value: 'text-green' },
  brand: { icon: 'bg-brand/10 border-brand/20 text-brand', value: 'text-brand' },
  error: { icon: 'bg-error/10 border-error/20 text-error', value: 'text-error' },
  neutral: { icon: 'bg-white/5 border-stroke text-muted2', value: 'text-text' },
};

function maxBy<T>(arr: T[], fn: (x: T) => number): T | undefined {
  if (!arr.length) return undefined;
  return arr.reduce((best, cur) => (fn(cur) > fn(best) ? cur : best), arr[0]);
}

export function InsightsPanel({ rows, comparison }: Props) {
  const insights = useMemo<Insight[]>(() => {
    if (!rows.length) return [];
    const out: Insight[] = [];

    const leader = rows[0];
    out.push({
      icon: <Crown className="h-4 w-4" />,
      title: 'Líder do ciclo',
      value: leader.playerName,
      hint: `${leader.score.toFixed(2)} pts • ${leader.teamName}`,
      tone: 'gold',
    });

    const rated = rows.filter((r) => r.matchesPlayed > 0 && r.averageRating > 0);
    const bestRating = maxBy(rated, (r) => r.averageRating);
    if (bestRating) {
      out.push({
        icon: <Star className="h-4 w-4" />,
        title: 'Melhor nota média',
        value: bestRating.averageRating.toFixed(2),
        hint: bestRating.playerName,
        tone: 'brand',
      });
    }

    const topScorer = maxBy(rows, (r) => r.goals);
    if (topScorer && topScorer.goals > 0) {
      out.push({
        icon: <Target className="h-4 w-4" />,
        title: 'Artilheiro',
        value: `${topScorer.goals} gols`,
        hint: topScorer.playerName,
        tone: 'green',
      });
    }

    const topAssister = maxBy(rows, (r) => r.assists);
    if (topAssister && topAssister.assists > 0) {
      out.push({
        icon: <Handshake className="h-4 w-4" />,
        title: 'Maior garçom',
        value: `${topAssister.assists} assist.`,
        hint: topAssister.playerName,
        tone: 'neutral',
      });
    }

    // Time com mais jogadores no top 10
    const teamCounts = new Map<string, number>();
    rows.slice(0, 10).forEach((r) => teamCounts.set(r.teamName, (teamCounts.get(r.teamName) ?? 0) + 1));
    const topTeam = Array.from(teamCounts.entries()).reduce<[string, number] | null>(
      (best, cur) => (!best || cur[1] > best[1] ? cur : best),
      null,
    );
    if (topTeam && topTeam[1] > 1) {
      out.push({
        icon: <Users className="h-4 w-4" />,
        title: 'Time em destaque',
        value: topTeam[0],
        hint: `${topTeam[1]} no top 10`,
        tone: 'brand',
      });
    }

    const inZone = rows.filter((r) => r.isPromotionZone).length;
    out.push({
      icon: <ShieldCheck className="h-4 w-4" />,
      title: 'Em zona de promoção',
      value: String(inZone),
      hint: inZone ? 'disputando o acesso' : 'ninguém elegível ainda',
      tone: inZone ? 'green' : 'neutral',
    });

    // Tendência de atividade vs ciclo anterior (só se houver histórico real)
    if (comparison?.deltas && comparison.previous) {
      const d = comparison.deltas.total_matches;
      if (Math.abs(d) >= 1) {
        out.push({
          icon: d >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />,
          title: 'Atividade vs. ciclo anterior',
          value: `${d > 0 ? '+' : ''}${d} partidas`,
          hint: d >= 0 ? 'mais jogos analisados' : 'menos jogos analisados',
          tone: d >= 0 ? 'green' : 'error',
        });
      }
    }

    return out;
  }, [rows, comparison]);

  if (!insights.length) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-stroke bg-panel">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/25 to-transparent" />
      <div className="flex items-center gap-2.5 px-5 pt-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-text">Insights automáticos</h3>
          <p className="text-xs text-muted2">Destaques calculados a partir do ciclo atual</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((ins, i) => {
          const tone = toneMap[ins.tone];
          return (
            <motion.div
              key={ins.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-xl border border-stroke bg-panel2/50 p-3"
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${tone.icon}`}>
                {ins.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.1em] text-muted2">{ins.title}</p>
                <p className={`truncate text-sm font-bold ${tone.value}`}>{ins.value}</p>
                {ins.hint && <p className="truncate text-[11px] text-muted2">{ins.hint}</p>}
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
