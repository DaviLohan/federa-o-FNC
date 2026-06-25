'use client';

import type { WeeklySelectionPayload } from '@/types';
import { Badge } from '@/components/shared/ui';
import { buildPitchSlots } from './weeklyLayout';
import { WeeklyPlayerNode } from './WeeklyPlayerNode';

export function WeeklyPitch({ payload }: { payload: WeeklySelectionPayload }) {
  const slots = buildPitchSlots(payload);

  return (
    <div className="rounded-3xl border border-stroke bg-surface1 p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text md:text-xl">Campo Tático</h2>
          <p className="text-sm text-muted2">Os 11 da rodada em formação 3-5-2</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="gold">{payload.championship.name}</Badge>
          {payload.round_number != null && <Badge variant="default">Rodada {payload.round_number}</Badge>}
          <Badge variant="gold">3-5-2</Badge>
        </div>
      </div>

      {/* Campo retrato — borda dourada via gradient-border */}
      <div className="gradient-border mx-auto w-full max-w-md">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[18px] bg-gradient-to-b from-[#0c1f17] to-[#0a1410]">
          {/* glow dourado no topo (ataque/MVP) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(214,161,30,0.12),transparent_70%)]" />

          {/* listras sutis de gramado */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(180deg, #ffffff 0px, #ffffff 1px, transparent 1px, transparent 56px)',
            }}
          />

          {/* marcações */}
          <div className="pointer-events-none absolute inset-3 rounded-[14px] border border-white/10" />
          {/* linha de meio */}
          <div className="pointer-events-none absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-white/10" />
          {/* círculo central */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
          {/* área superior (ataque) */}
          <div className="pointer-events-none absolute left-1/2 top-3 h-[14%] w-2/5 -translate-x-1/2 rounded-b-lg border border-t-0 border-white/10" />
          {/* área inferior (defesa/GK) */}
          <div className="pointer-events-none absolute bottom-3 left-1/2 h-[14%] w-2/5 -translate-x-1/2 rounded-t-lg border border-b-0 border-white/10" />

          {/* jogadores */}
          <div className="absolute inset-0">
            {slots.map((slot) => (
              <div
                key={slot.key}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${slot.left}%`, top: `${slot.top}%` }}
              >
                <WeeklyPlayerNode label={slot.label} player={slot.player} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
