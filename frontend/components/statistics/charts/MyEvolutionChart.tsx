'use client';

import { useMemo } from 'react';
import { LineChartIcon, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import type { MyRankingHistoryPoint } from '@/types';
import { ChartCard } from './ChartCard';
import { CHART, AXIS_TICK } from './chartTheme';

interface Props {
  history: MyRankingHistoryPoint[];
}

function fmtCycle(slug: string) {
  // "2026-06" -> "06/26"
  const [y, m] = slug.split('-');
  return y && m ? `${m}/${y.slice(2)}` : slug;
}

function TooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-surface1 px-3.5 py-2.5 text-sm shadow-xl">
      <p className="mb-1 font-semibold text-text">Ciclo {d.cycleFull}</p>
      <p className="font-mono text-xs text-gold">Score {d.score.toFixed(2)}</p>
      {d.generalPosition != null && <p className="font-mono text-xs text-muted2">Pos. geral #{d.generalPosition}</p>}
      <p className="font-mono text-[10px] text-muted2">Nota {d.averageRating.toFixed(2)} • {d.goals}G {d.assists}A</p>
    </div>
  );
}

export function MyEvolutionChart({ history }: Props) {
  const data = useMemo(
    () => history.map((h) => ({ ...h, cycleLabel: fmtCycle(h.cycle), cycleFull: h.cycle })),
    [history],
  );

  if (data.length < 2) {
    return (
      <ChartCard title="Evolução do score" subtitle="Sua trajetória por ciclo" icon={<LineChartIcon className="h-4 w-4" />}>
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <TrendingUp className="h-7 w-7 text-muted2" />
          <p className="text-xs text-muted2">
            Jogue em mais ciclos para visualizar sua evolução ao longo do tempo.
          </p>
        </div>
      </ChartCard>
    );
  }

  const delta = data[data.length - 1].score - data[data.length - 2].score;
  const deltaUp = delta >= 0;

  return (
    <ChartCard
      title="Evolução do score"
      subtitle="Sua trajetória por ciclo"
      icon={<LineChartIcon className="h-4 w-4" />}
      action={
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-xs ${
            deltaUp ? 'border-green/30 bg-green/10 text-green' : 'border-error/30 bg-error/10 text-error'
          }`}
        >
          {deltaUp ? '↑' : '↓'} {Math.abs(delta).toFixed(2)}
        </span>
      }
    >
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ left: -18, right: 12, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="evoLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={CHART.gold} stopOpacity={0.5} />
              <stop offset="100%" stopColor={CHART.gold2} stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="cycleLabel" tick={AXIS_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} />
          <Tooltip content={<TooltipContent />} cursor={{ stroke: CHART.grid }} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="url(#evoLine)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: CHART.gold, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: CHART.gold2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
