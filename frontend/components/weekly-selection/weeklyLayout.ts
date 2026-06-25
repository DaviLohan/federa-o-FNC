import { FORMATION_POSITIONS } from '@/lib/formations';
import type { WeeklySelectionPayload, WeeklySelectionPlayer } from '@/types';

export const FORMATION = '3-5-2';

export type PitchSlot = {
  key: string;
  label: string;
  /** posição vertical no campo retrato (0 = topo/ataque, 100 = base/GK) */
  top: number;
  /** posição horizontal no campo retrato (0 = esquerda, 100 = direita) */
  left: number;
  player: WeeklySelectionPlayer | null;
};

export function inferGroup(position: string): 'GK' | 'DEF' | 'MID' | 'ATT' {
  const pos = (position || '').toUpperCase();
  if (pos === 'GK') return 'GK';
  if (['CB', 'RB', 'LB', 'RWB', 'LWB', 'DEF', 'SW'].includes(pos)) return 'DEF';
  if (['ST', 'CF', 'RW', 'LW', 'ATT', 'FWD'].includes(pos)) return 'ATT';
  return 'MID';
}

/**
 * Transpõe as coordenadas landscape de `formations.ts` (GK à esquerda → ataque
 * à direita) para um campo **retrato** (ataque no topo, GK na base), com inset
 * de 12–88% para os nós não clipam nas bordas.
 */
export function toVerticalPos(x: number, y: number): { top: number; left: number } {
  const nx = Math.min(1, Math.max(0, (x - 8) / (80 - 8))); // 0 = GK, 1 = ataque
  return {
    top: 12 + (1 - nx) * 76,
    left: 12 + (y / 100) * 76,
  };
}

export function buildPitchSlots(payload: WeeklySelectionPayload | undefined): PitchSlot[] {
  const slots = FORMATION_POSITIONS[FORMATION];
  const grouped = {
    GK: [...(payload?.lineup.GK || [])],
    DEF: [...(payload?.lineup.DEF || [])],
    MID: [...(payload?.lineup.MID || [])],
    ATT: [...(payload?.lineup.ATT || [])],
  };

  return slots.map((slot, index) => {
    const group = inferGroup(slot.position);
    const player = grouped[group].shift() || null;
    const { top, left } = toVerticalPos(slot.x, slot.y);
    return {
      key: `${slot.position}-${index}`,
      label: slot.position,
      top,
      left,
      player,
    };
  });
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '—'
  );
}

export function formatRating(value: number | null | undefined): string {
  return value && value > 0 ? value.toFixed(1) : '—';
}
