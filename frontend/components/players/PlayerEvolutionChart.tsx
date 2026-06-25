'use client';

import { useMemo } from 'react';
import { LineChartIcon, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { PlayerHistoryMatch } from '@/types';
import { ChartCard } from '@/components/statistics/charts/ChartCard';
import { CHART, AXIS_TICK } from '@/components/statistics/charts/chartTheme';

interface Props {
  history: PlayerHistoryMatch[];
}

function TooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-surface1 px-3.5 py-2.5 text-sm shadow-xl">
      <p className="mb-1 font-semibold text-text">vs {d.opponent}</p>
      <p className="font-mono text-xs text-gold">Nota {d.rating.toFixed(2)}</p>
      <p className="font-mono text-[10px] text-muted2">{d.goals}G {d.assists}A</p>
    </div>
  );
}

export function PlayerEvolutionChart({ history }: Props) {
  // Apenas partidas com nota (dados EA), em ordem cronológica.
  const data = useMemo(
    () =>
      [...history]
        .reverse()
        .filter((h) => h.rating !== null)
        .map((h, idx) => ({
          idx: idx + 1,
          rating: h.rating as number,
          goals: h.goals,
          assists: h.assists,
          opponent: h.opponent?.abbreviation || h.opponent?.name || '—',
        })),
    [history],
  );

  if (data.length < 2) {
    return (
      <ChartCard title="Evolução de desempenho" subtitle="Nota por partida" icon={<LineChartIcon className="h-4 w-4" />}>
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <TrendingUp className="h-7 w-7 text-muted2" />
          <p className="text-xs text-muted2">
            Sem dados avançados suficientes. A evolução aparece para partidas reportadas via integração EA.
          </p>
        </div>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Evolução de desempenho" subtitle="Nota por partida" icon={<LineChartIcon className="h-4 w-4" />}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ left: -18, right: 12, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="playerEvoLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={CHART.gold} stopOpacity={0.5} />
              <stop offset="100%" stopColor={CHART.gold2} stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="opponent" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} domain={[0, 10]} />
          <Tooltip content={<TooltipContent />} cursor={{ stroke: CHART.grid }} />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="url(#playerEvoLine)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: CHART.gold, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: CHART.gold2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
