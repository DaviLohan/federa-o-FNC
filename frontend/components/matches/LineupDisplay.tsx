'use client';

/**
 * LineupDisplay.tsx
 *
 * Read-only tactical lineup display for match detail pages (/matches/[id]).
 * Renders a horizontal football pitch with positioned players and a roster
 * panel sidebar grouped by tactical line.
 *
 * Resilient to invalid stored data — automatically falls back to
 * FORMATION_POSITIONS when coordinates are unreliable (e.g. legacy data
 * with grid indices instead of field percentages).
 */

import { useQuery } from '@tanstack/react-query';
import { matchLineupsAPI } from '@/lib/api';
import { Loader2, Shield } from 'lucide-react';
import type { MatchLineup, MatchLineupPlayer } from '@/types';
import type { TacticalFormation } from '@/types';
import { FORMATION_POSITIONS, type FormationSlot } from '@/lib/formations';
import { formatDate } from '@/lib/utils/date';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DisplayPlayer {
  player: MatchLineupPlayer['player'];
  position: string;
  x: number; // 0-100 — left (GK) to right (attack)
  y: number; // 0-100 — top to bottom
}

type TacticalLine = 'GK' | 'DEF' | 'MID' | 'ATT';

// ─── Constants ───────────────────────────────────────────────────────────────

const DEF_POSITIONS = new Set(['CB', 'RB', 'LB', 'RWB', 'LWB', 'SW']);
const MID_POSITIONS = new Set(['CDM', 'CM', 'CAM', 'RM', 'LM']);

/** Hex accent per tactical line — used for inline styles to avoid Tailwind purge. */
const LINE_COLORS: Record<TacticalLine, string> = {
  GK:  '#f59e0b', // amber
  DEF: '#38bdf8', // sky
  MID: '#34d399', // emerald
  ATT: '#f87171', // rose
};

const LINE_LABELS: Record<TacticalLine, string> = {
  GK:  'Goleiro',
  DEF: 'Defesa',
  MID: 'Meio-Campo',
  ATT: 'Ataque',
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function getTacticalLine(position: string): TacticalLine {
  const p = position.toUpperCase();
  if (p === 'GK') return 'GK';
  if (DEF_POSITIONS.has(p)) return 'DEF';
  if (MID_POSITIONS.has(p)) return 'MID';
  return 'ATT';
}

function getInitials(name: string): string {
  return (name || '??')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function getLastName(name: string): string {
  const parts = name.split(' ');
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

// ─── Data Sanitization ───────────────────────────────────────────────────────

/**
 * Ensures lineup data has valid field coordinates for rendering.
 *
 * Detection: if stored x/y values lack reasonable spread (>15% range in
 * both axes) or exceed 100, the data is considered invalid and we fall
 * back to matching players to FORMATION_POSITIONS slots.
 *
 * Matching priority:
 *   1. Exact position label match (e.g. player.position === slot.position)
 *   2. Same tactical line match  (e.g. both DEF)
 *   3. Any remaining unmatched player fills any remaining slot
 */
function prepareDisplayPlayers(lineup: MatchLineup): DisplayPlayer[] {
  const formation = lineup.formation;
  const slots: FormationSlot[] | undefined =
    formation in FORMATION_POSITIONS
      ? FORMATION_POSITIONS[formation as TacticalFormation]
      : undefined;
  const players = lineup.players.slice(0, 11);

  // ── Validate stored coordinates ──
  if (players.length > 0) {
    const xs = players.map((p) => p.x_position);
    const ys = players.map((p) => p.y_position);
    const xSpread = Math.max(...xs) - Math.min(...xs);
    const ySpread = Math.max(...ys) - Math.min(...ys);
    const maxVal = Math.max(...xs, ...ys);
    const hasValidCoords =
      xSpread > 15 && ySpread > 15 && maxVal <= 100 && maxVal > 10;

    if (hasValidCoords) {
      return players.map((p) => ({
        player: p.player,
        position: p.position,
        x: p.x_position,
        y: p.y_position,
      }));
    }
  }

  // ── Fallback: unknown formation → basic grid spread ──
  if (!slots) {
    return players.map((p, i) => ({
      player: p.player,
      position: p.position,
      x: 10 + (i % 4) * 25,
      y: 15 + Math.floor(i / 4) * 25,
    }));
  }

  // ── Fallback: match players to formation slots ──
  const result: DisplayPlayer[] = [];
  const usedPlayers = new Set<number>();
  const usedSlots = new Set<number>();

  // Pass 1 — exact position
  for (let si = 0; si < slots.length; si++) {
    for (let pi = 0; pi < players.length; pi++) {
      if (usedPlayers.has(pi) || usedSlots.has(si)) continue;
      if (players[pi].position.toUpperCase() === slots[si].position.toUpperCase()) {
        result.push({
          player: players[pi].player,
          position: slots[si].position,
          x: slots[si].x,
          y: slots[si].y,
        });
        usedPlayers.add(pi);
        usedSlots.add(si);
        break;
      }
    }
  }

  // Pass 2 — same tactical line
  for (let si = 0; si < slots.length; si++) {
    if (usedSlots.has(si)) continue;
    const slotLine = getTacticalLine(slots[si].position);
    for (let pi = 0; pi < players.length; pi++) {
      if (usedPlayers.has(pi)) continue;
      if (getTacticalLine(players[pi].position) === slotLine) {
        result.push({
          player: players[pi].player,
          position: slots[si].position,
          x: slots[si].x,
          y: slots[si].y,
        });
        usedPlayers.add(pi);
        usedSlots.add(si);
        break;
      }
    }
  }

  // Pass 3 — any remaining
  for (let si = 0; si < slots.length; si++) {
    if (usedSlots.has(si)) continue;
    for (let pi = 0; pi < players.length; pi++) {
      if (usedPlayers.has(pi)) continue;
      result.push({
        player: players[pi].player,
        position: slots[si].position,
        x: slots[si].x,
        y: slots[si].y,
      });
      usedPlayers.add(pi);
      usedSlots.add(si);
      break;
    }
  }

  return result;
}

// ─── Pitch Field ─────────────────────────────────────────────────────────────

function PitchField({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full select-none overflow-hidden rounded-xl aspect-[3/2] sm:aspect-[2/1]"
      style={{
        background: 'linear-gradient(170deg, #1d7a31 0%, #1a6b2a 40%, #176224 100%)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
      }}
    >
      {/* Grass stripes */}
      <div
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(
            to right,
            rgba(255,255,255,0.018) 0px, rgba(255,255,255,0.018) 50px,
            transparent 50px, transparent 100px
          )`,
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.28) 100%)',
        }}
      />

      {/* ─── Field markings ─── */}

      {/* Outer boundary */}
      <div
        className="absolute border-2 border-white/[0.18] rounded-sm pointer-events-none"
        style={{ inset: '4%' }}
      />

      {/* Center line */}
      <div
        className="absolute border-l-2 border-white/[0.18] pointer-events-none"
        style={{ left: '50%', top: '4%', bottom: '4%' }}
      />

      {/* Center circle */}
      <div
        className="absolute border-2 border-white/[0.18] rounded-full pointer-events-none"
        style={{
          width: '15%',
          aspectRatio: '1 / 1',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Center spot */}
      <div
        className="absolute w-1.5 h-1.5 bg-white/30 rounded-full pointer-events-none"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      />

      {/* Left penalty area */}
      <div
        className="absolute border-2 border-white/[0.18] pointer-events-none"
        style={{ width: '16%', height: '56%', left: '4%', top: '22%', borderLeft: 'none' }}
      />

      {/* Left goal area */}
      <div
        className="absolute border-2 border-white/[0.18] pointer-events-none"
        style={{ width: '7%', height: '30%', left: '4%', top: '35%', borderLeft: 'none' }}
      />

      {/* Left penalty spot */}
      <div
        className="absolute w-1 h-1 bg-white/25 rounded-full pointer-events-none"
        style={{ left: '14%', top: '50%', transform: 'translate(-50%, -50%)' }}
      />

      {/* Left penalty arc */}
      <div
        className="absolute border-2 border-white/[0.12] pointer-events-none"
        style={{
          width: '5%',
          height: '18%',
          left: '17%',
          top: '41%',
          borderRadius: '0 50% 50% 0',
          borderLeft: 'none',
        }}
      />

      {/* Right penalty area */}
      <div
        className="absolute border-2 border-white/[0.18] pointer-events-none"
        style={{ width: '16%', height: '56%', right: '4%', top: '22%', borderRight: 'none' }}
      />

      {/* Right goal area */}
      <div
        className="absolute border-2 border-white/[0.18] pointer-events-none"
        style={{ width: '7%', height: '30%', right: '4%', top: '35%', borderRight: 'none' }}
      />

      {/* Right penalty spot */}
      <div
        className="absolute w-1 h-1 bg-white/25 rounded-full pointer-events-none"
        style={{ right: '14%', top: '50%', transform: 'translate(50%, -50%)' }}
      />

      {/* Right penalty arc */}
      <div
        className="absolute border-2 border-white/[0.12] pointer-events-none"
        style={{
          width: '5%',
          height: '18%',
          right: '17%',
          top: '41%',
          borderRadius: '50% 0 0 50%',
          borderRight: 'none',
        }}
      />

      {/* Players layer */}
      {children}
    </div>
  );
}

// ─── Player Chip (on-pitch marker) ───────────────────────────────────────────

function PlayerChip({ player }: { player: DisplayPlayer }) {
  const line = getTacticalLine(player.position);
  const color = LINE_COLORS[line];
  const initials = getInitials(player.player.player_name);
  const lastName = getLastName(player.player.player_name);

  return (
    <div
      className="absolute flex flex-col items-center pointer-events-none"
      style={{
        left: `${player.x}%`,
        top: `${player.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
      }}
    >
      {/* Position badge */}
      <span
        className="text-[7px] sm:text-[8px] md:text-[9px] font-bold px-1 sm:px-1.5 py-px sm:py-0.5 rounded-sm leading-none mb-0.5"
        style={{
          color,
          backgroundColor: `${color}25`,
          border: `1px solid ${color}40`,
        }}
      >
        {player.position}
      </span>

      {/* Avatar circle */}
      <div
        className="w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center overflow-hidden"
        style={{
          border: `2.5px solid ${color}`,
          background: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(4px)',
          boxShadow: `0 0 14px ${color}30, 0 2px 8px rgba(0,0,0,0.5)`,
        }}
      >
        {player.player.avatar ? (
          <img
            src={player.player.avatar}
            alt={player.player.player_name}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <span className="text-[9px] sm:text-[10px] md:text-xs font-bold text-white">
            {initials}
          </span>
        )}
      </div>

      {/* Name */}
      <span
        className="text-[7px] sm:text-[8px] md:text-[9px] text-white font-semibold mt-0.5 max-w-[52px] sm:max-w-[64px] md:max-w-[72px] truncate text-center leading-none"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
      >
        {lastName}
      </span>
    </div>
  );
}

// ─── Roster Panel (sidebar) ──────────────────────────────────────────────────

function RosterPanel({ players }: { players: DisplayPlayer[] }) {
  const grouped = new Map<TacticalLine, DisplayPlayer[]>();
  for (const p of players) {
    const line = getTacticalLine(p.position);
    if (!grouped.has(line)) grouped.set(line, []);
    grouped.get(line)!.push(p);
  }

  const lineOrder: TacticalLine[] = ['GK', 'DEF', 'MID', 'ATT'];

  return (
    <div className="bg-panel2 rounded-xl border border-stroke overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stroke/50 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand" />
          <h4 className="text-sm font-semibold text-text">Elenco Convocado</h4>
        </div>
        <span className="text-xs font-bold text-brand bg-brand/10 px-2.5 py-0.5 rounded-full border border-brand/20">
          {players.length}
        </span>
      </div>

      {/* Grouped list */}
      <div>
        {lineOrder.map((line) => {
          const group = grouped.get(line);
          if (!group || group.length === 0) return null;
          const color = LINE_COLORS[line];

          return (
            <div key={line}>
              {/* Group header */}
              <div className="px-4 py-2 border-b border-stroke/20 bg-white/[0.015]">
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color }}
                  >
                    {LINE_LABELS[line]}
                  </span>
                  <span className="text-[10px] text-muted2">({group.length})</span>
                </div>
              </div>

              {/* Players */}
              {group.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors border-b border-stroke/10 last:border-b-0"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-panel flex items-center justify-center shrink-0 overflow-hidden border border-stroke/60">
                    {p.player.avatar ? (
                      <img
                        src={p.player.avatar}
                        alt={p.player.player_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-muted2">
                        {getInitials(p.player.player_name)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">
                      {p.player.player_name}
                    </p>
                    {p.player.gamer_tag && (
                      <p className="text-[11px] text-muted2 truncate">
                        {p.player.gamer_tag}
                      </p>
                    )}
                  </div>

                  {/* Position badge */}
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0"
                    style={{
                      color,
                      backgroundColor: `${color}15`,
                    }}
                  >
                    {p.position}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface LineupDisplayProps {
  matchId: number;
}

export function LineupDisplay({ matchId }: LineupDisplayProps) {
  const {
    data: lineup,
    isLoading,
    isError,
  } = useQuery<MatchLineup>({
    queryKey: ['match-lineup-display', matchId],
    queryFn: () => matchLineupsAPI.get(matchId),
    retry: false,
  });

  // Loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3 text-muted2">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Carregando escalação...</span>
      </div>
    );
  }

  // No lineup (404 or not a team member)
  if (isError || !lineup) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-12 h-12 rounded-full bg-panel2 flex items-center justify-center">
          <Shield className="w-6 h-6 text-muted2" />
        </div>
        <p className="text-sm font-medium text-muted">
          Nenhuma escalação confirmada ainda
        </p>
        <p className="text-xs text-muted2 text-center max-w-xs">
          A escalação será exibida aqui quando o capitão ou dono do time confirmar a formação
        </p>
      </div>
    );
  }

  const displayPlayers = prepareDisplayPlayers(lineup);

  return (
    <div className="space-y-4">
      {/* Team header + formation badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {lineup.team.logo ? (
            <img
              src={lineup.team.logo}
              alt={lineup.team.name}
              className="w-7 h-7 rounded-lg object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-panel2 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5 text-muted2" />
            </div>
          )}
          <span className="text-sm font-semibold text-text">{lineup.team.name}</span>
        </div>
        <span className="text-xs font-bold text-brand bg-brand/10 px-3 py-1 rounded-full border border-brand/20">
          {lineup.formation}
        </span>
      </div>

      {/* Pitch + Roster grid */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 items-start">
        {/* Pitch */}
        <div>
          <PitchField>
            {displayPlayers.map((p, i) => (
              <PlayerChip key={i} player={p} />
            ))}
          </PitchField>
          <div className="flex justify-between mt-2 px-1">
            <span className="text-[10px] text-muted2 uppercase tracking-widest">
              ◀ GK / Defesa
            </span>
            <span className="text-[10px] text-muted2 uppercase tracking-widest">
              Ataque ▶
            </span>
          </div>
        </div>

        {/* Roster sidebar */}
        <RosterPanel players={displayPlayers} />
      </div>

      {/* Footer: who submitted */}
      <p className="text-[11px] text-muted2 text-right">
        Escalação definida por{' '}
        {lineup.submitted_by.full_name || lineup.submitted_by.email}
        {' · '}
        {formatDate(lineup.created_at)}
      </p>
    </div>
  );
}
