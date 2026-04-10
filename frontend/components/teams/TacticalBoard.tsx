'use client';

/**
 * TacticalBoard.tsx
 *
 * Campo tático interativo para escalação de partidas.
 *
 * Funcionalidades:
 *  - Seletor de próxima partida (filtra partidas SCHEDULED do time)
 *  - Seletor de formação (8 opções incluindo 3-5-2)
 *  - Campo de futebol visual com linhas em CSS puro
 *  - 11 slots posicionados dinamicamente pelas coordenadas de formations.ts
 *  - Card de seleção via React Portal (nunca clipado pelo overflow do campo)
 *  - getSmartCardPosition() — posicionamento inteligente global para qualquer slot
 *  - Bloqueia seleção duplicada (um jogador por slot)
 *  - Indicador de compatibilidade de posição (verde/amarelo/vermelho)
 *  - Drag & drop entre slots para trocar jogadores de posição
 *  - Botão "Limpar Escalação" para resetar todos os slots
 *  - Carrega escalação existente (GET) ao selecionar partida
 *  - Botão "Confirmar Escalação e Convocar" — dispara POST + notificações
 *  - Após confirmar: botão "Baixar Escalação" gera infográfico PNG via Canvas 2D
 *  - Overlay de desenho (caneta, seta, círculo, borracha) persistido no localStorage
 *  - Marcação de adversário: carrega escalação rival e exibe no campo em vermelho
 *  - Modo readOnly: não-owners veem o campo com a escalação confirmada (sem edição)
 */

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionValue } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchesAPI, matchLineupsAPI } from '@/lib/api';
import { FORMATION_POSITIONS, AVAILABLE_FORMATIONS } from '@/lib/formations';
import { useToast } from '@/components/shared/ui';
import type {
  Team,
  TeamMembership,
  TacticalFormation,
  MatchLineupPlayerData,
} from '@/types';
import { ChevronDown, User, Check, X, Loader2, Swords, Trash2, AlertTriangle, ImageIcon, Pencil, MousePointer, Circle, Eraser, Eye, EyeOff, Move } from 'lucide-react';
import { formatToday, formatDayMonth, formatDateTimeShort } from '@/lib/utils/date';

// ---------------------------------------------------------------------------
// Compatibilidade de posições
// ---------------------------------------------------------------------------

const POSITION_COMPATIBILITY: Record<string, { compatible: string[]; acceptable: string[] }> = {
  GK:  { compatible: ['GK'],                              acceptable: [] },
  RB:  { compatible: ['RB'],                              acceptable: ['CB', 'RWB', 'RM'] },
  LB:  { compatible: ['LB'],                              acceptable: ['CB', 'LWB', 'LM'] },
  CB:  { compatible: ['CB'],                              acceptable: ['RB', 'LB', 'CDM', 'SW'] },
  SW:  { compatible: ['SW', 'CB'],                        acceptable: ['RB', 'LB', 'CDM'] },
  RWB: { compatible: ['RWB'],                             acceptable: ['RB', 'RM'] },
  LWB: { compatible: ['LWB'],                             acceptable: ['LB', 'LM'] },
  CDM: { compatible: ['CDM'],                             acceptable: ['CB', 'CM', 'DM'] },
  CM:  { compatible: ['CM'],                              acceptable: ['CDM', 'CAM', 'RM', 'LM'] },
  RM:  { compatible: ['RM'],                              acceptable: ['RB', 'RWB', 'RW', 'CM'] },
  LM:  { compatible: ['LM'],                              acceptable: ['LB', 'LWB', 'LW', 'CM'] },
  CAM: { compatible: ['CAM'],                             acceptable: ['CM', 'CF', 'RW', 'LW'] },
  RW:  { compatible: ['RW'],                              acceptable: ['RWB', 'RM', 'ST', 'CAM'] },
  LW:  { compatible: ['LW'],                              acceptable: ['LWB', 'LM', 'ST', 'CAM'] },
  CF:  { compatible: ['CF'],                              acceptable: ['ST', 'CAM', 'RW', 'LW'] },
  ST:  { compatible: ['ST'],                              acceptable: ['CF', 'RW', 'LW', 'CAM'] },
};

type CompatibilityLevel = 'compatible' | 'acceptable' | 'incompatible' | 'none';

function getCompatibility(slotPosition: string, playerPosition?: string): CompatibilityLevel {
  if (!playerPosition) return 'none';
  const map = POSITION_COMPATIBILITY[slotPosition];
  if (!map) return 'none';
  if (map.compatible.includes(playerPosition)) return 'compatible';
  if (map.acceptable.includes(playerPosition)) return 'acceptable';
  return 'incompatible';
}

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

type LineupState = Record<number, number | null>;

type DrawTool = 'pen' | 'arrow' | 'circle' | 'eraser';

interface DrawPoint { x: number; y: number; }
interface DrawStroke {
  tool: DrawTool;
  color: string;
  points: DrawPoint[];
}

// Posições customizadas (drag livre) por slot index
type CustomPositions = Record<number, { x: number; y: number }>;

// ---------------------------------------------------------------------------
// Utilitários de desenho — localStorage
// ---------------------------------------------------------------------------

function loadDrawings(matchId: number | null): DrawStroke[] {
  if (!matchId) return [];
  try {
    const raw = localStorage.getItem(`match-drawing-${matchId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveDrawings(matchId: number | null, strokes: DrawStroke[]): void {
  if (!matchId) return;
  try {
    localStorage.setItem(`match-drawing-${matchId}`, JSON.stringify(strokes));
  } catch { /* quota exceeded — ignore */ }
}

// ---------------------------------------------------------------------------
// Utilitários de posições customizadas — localStorage
// ---------------------------------------------------------------------------

function loadCustomPositions(matchId: number | null): CustomPositions {
  if (!matchId) return {};
  try {
    const raw = localStorage.getItem(`match-positions-${matchId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveCustomPositions(matchId: number | null, positions: CustomPositions): void {
  if (!matchId) return;
  try {
    if (Object.keys(positions).length === 0) {
      localStorage.removeItem(`match-positions-${matchId}`);
    } else {
      localStorage.setItem(`match-positions-${matchId}`, JSON.stringify(positions));
    }
  } catch { /* quota exceeded — ignore */ }
}

// ---------------------------------------------------------------------------
// getSmartCardPosition — posicionamento global e dinâmico
// ---------------------------------------------------------------------------

const CARD_W   = 224;
const CARD_H   = 300;
const CARD_GAP = 8;
const SAFE_PAD = 16;

interface CardPosition {
  top:  number;
  left: number;
}

function getSmartCardPosition(slotEl: HTMLElement): CardPosition {
  const rect = slotEl.getBoundingClientRect();
  const vpW  = window.innerWidth;
  const vpH  = window.innerHeight;

  const anchorX = rect.left + rect.width  / 2 - CARD_W / 2;
  const anchorY = rect.bottom + CARD_GAP;

  let left = anchorX;
  if (left + CARD_W + SAFE_PAD > vpW) left = vpW - CARD_W - SAFE_PAD;
  if (left < SAFE_PAD) left = SAFE_PAD;

  let top = anchorY;
  if (top + CARD_H + SAFE_PAD > vpH) top = rect.top - CARD_H - CARD_GAP;
  if (top < SAFE_PAD) top = SAFE_PAD;

  return { top, left };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TacticalBoardProps {
  team: Team;
  members: TeamMembership[];
  readOnly?: boolean;
}

// ---------------------------------------------------------------------------
// FieldSlot — slot individual com card via portal
// ---------------------------------------------------------------------------

interface SlotProps {
  slotIndex: number;
  position: string;
  x: number;
  y: number;
  selectedPlayerId: number | null;
  availableMembers: TeamMembership[];
  allMembers: TeamMembership[];
  isOpen: boolean;
  readOnly?: boolean;
  isDragOver?: boolean;
  onToggle: (index: number) => void;
  onSelect: (slotIndex: number, playerId: number | null) => void;
  onDragStart?: (slotIndex: number) => void;
  onDragOver?: (slotIndex: number) => void;
  onDrop?: (targetIndex: number) => void;
}

function FieldSlot({
  slotIndex,
  position,
  x,
  y,
  selectedPlayerId,
  availableMembers,
  allMembers,
  isOpen,
  readOnly,
  isDragOver,
  onToggle,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
}: SlotProps) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [cardPos, setCardPos] = useState<CardPosition | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const clickedSlot = slotRef.current?.contains(target);
      const clickedCard = (target as HTMLElement).closest?.('[data-tactical-card]');
      if (!clickedSlot && !clickedCard) onToggle(-1);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onToggle]);

  useLayoutEffect(() => {
    if (!isOpen || !slotRef.current) {
      setCardPos(null);
      setVisible(false);
      return;
    }
    const calculate = () => {
      if (!slotRef.current) return;
      const pos = getSmartCardPosition(slotRef.current);
      setCardPos(pos);
      requestAnimationFrame(() => setVisible(true));
    };
    calculate();
    window.addEventListener('resize', calculate);
    window.addEventListener('scroll', calculate, true);
    return () => {
      window.removeEventListener('resize', calculate);
      window.removeEventListener('scroll', calculate, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setVisible(false);
  }, [isOpen]);

  const selectedMember = selectedPlayerId
    ? allMembers.find((m) => m.player.id === selectedPlayerId)
    : null;

  const compatibility = getCompatibility(position, selectedMember?.player.primary_position);

  const compatColors = {
    compatible:   { ring: '#22c55e', glow: 'rgba(34,197,94,0.4)'  },
    acceptable:   { ring: '#eab308', glow: 'rgba(234,179,8,0.4)'  },
    incompatible: { ring: '#ef4444', glow: 'rgba(239,68,68,0.4)'  },
    none:         { ring: '#D6A11E', glow: 'rgba(214,161,30,0.5)' },
  };

  const colors = compatColors[compatibility];

  const initials = selectedMember
    ? (selectedMember.player.player_name || '??')
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : null;

  const card = isOpen && cardPos
    ? createPortal(
        <div
          data-tactical-card
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position:   'fixed',
            top:        cardPos.top,
            left:       cardPos.left,
            width:      CARD_W,
            zIndex:     9999,
            opacity:    visible ? 1 : 0,
            transform:  visible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-4px)',
            transition: 'opacity 150ms ease, transform 150ms ease',
            pointerEvents: 'auto',
          }}
          className="bg-[#0F1318] border border-[#D6A11E]/30 rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#D6A11E] uppercase tracking-wider">
                {position}
              </span>
              <div className="flex gap-1 mt-0.5">
                <span className="text-[9px] text-green-400">● Ideal</span>
                <span className="text-[9px] text-yellow-400">● OK</span>
                <span className="text-[9px] text-red-400">● Fora</span>
              </div>
            </div>
            {selectedMember && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(slotIndex, null);
                  onToggle(-1);
                }}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Remover jogador"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto">
            {availableMembers.length === 0 ? (
              <p className="px-3 py-4 text-xs text-white/40 text-center">
                Todos os jogadores já foram escalados.
              </p>
            ) : (
              availableMembers.map((member) => {
                const compat   = getCompatibility(position, member.player.primary_position);
                const dotColor = compat === 'compatible'
                  ? 'text-green-400'
                  : compat === 'acceptable'
                  ? 'text-yellow-400'
                  : 'text-red-400';
                return (
                  <button
                    key={member.player.id}
                    type="button"
                    onClick={() => {
                      onSelect(slotIndex, member.player.id);
                      onToggle(-1);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/[0.05] transition-colors"
                  >
                    <span className={`text-[10px] flex-shrink-0 ${dotColor}`}>●</span>
                    <div className="w-7 h-7 rounded-full bg-[#D6A11E]/20 border border-[#D6A11E]/40 flex items-center justify-center flex-shrink-0">
                      {member.player.avatar ? (
                        <img
                          src={member.player.avatar}
                          alt={member.player.player_name}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <User className="w-3.5 h-3.5 text-[#D6A11E]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-white truncate">
                        {member.player.player_name}
                      </p>
                      <p className="text-[10px] text-white/40">
                        {member.player.primary_position}
                      </p>
                    </div>
                    <span className="ml-auto text-[9px] font-bold text-[#D6A11E] bg-[#D6A11E]/10 px-1.5 py-0.5 rounded flex-shrink-0">
                      {member.player.primary_position}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div
        ref={slotRef}
        data-slot-index={slotIndex}
        style={{ zIndex: isOpen ? 30 : 10, position: 'relative' }}
        onDragOver={readOnly ? undefined : (e) => { e.preventDefault(); onDragOver?.(slotIndex); }}
        onDrop={readOnly ? undefined : (e) => { e.preventDefault(); onDrop?.(slotIndex); }}
      >
        <button
          type="button"
          draggable={!readOnly && !!selectedPlayerId}
          onDragStart={(!readOnly && selectedPlayerId) ? () => onDragStart?.(slotIndex) : undefined}
          onClick={readOnly ? undefined : () => onToggle(slotIndex)}
          className={`relative flex flex-col items-center gap-0.5 group focus:outline-none ${
            readOnly ? 'cursor-default' : 'cursor-pointer'
          }`}
          style={{ transform: 'rotateX(-18deg)' }}
          title={
            selectedMember
              ? `${selectedMember.player.player_name} (${selectedMember.player.primary_position})`
              : `Selecionar ${position}`
          }
        >
          <div
            className="w-11 h-11 rounded-full border-2 flex items-center justify-center shadow-lg"
            style={
              isDragOver
                ? { background: 'rgba(214,161,30,0.3)', borderColor: '#D6A11E', borderStyle: 'solid' }
                : selectedMember
                ? { background: colors.ring, borderColor: colors.ring, boxShadow: `0 0 12px ${colors.glow}`,
                    transition: 'all 0.2s' }
                : { background: 'rgba(0,0,0,0.4)', borderColor: '#D6A11E', borderStyle: 'dashed',
                    transition: 'all 0.2s' }
            }
          >
            {selectedMember ? (
              <>
                <span className="text-xs font-bold text-black leading-none">{initials}</span>
                {compatibility === 'incompatible' && (
                  <AlertTriangle
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 text-red-400 drop-shadow"
                    style={{ filter: 'drop-shadow(0 0 3px rgba(239,68,68,0.8))' }}
                  />
                )}
              </>
            ) : (
              readOnly
                ? <span className="text-[#D6A11E]/40 text-sm leading-none select-none">—</span>
                : <span className="text-[#D6A11E] text-lg font-light leading-none select-none">+</span>
            )}
          </div>

          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded leading-none"
            style={
              selectedMember
                ? { background: colors.ring, color: 'black' }
                : { background: 'rgba(0,0,0,0.6)', color: '#D6A11E' }
            }
          >
            {position}
          </span>

          {selectedMember && (
            <span className="text-[9px] text-white/90 font-medium max-w-[70px] truncate text-center leading-none mt-0.5 drop-shadow">
              {selectedMember.player.player_name.split(' ')[0]}
            </span>
          )}
        </button>
      </div>
      {!readOnly && card}
    </>
  );
}

// ---------------------------------------------------------------------------
// DraggableSlot — wraps FieldSlot with framer-motion free drag
// ---------------------------------------------------------------------------

interface DraggableSlotProps extends SlotProps {
  drawingActive: boolean;
  fieldRef: React.RefObject<HTMLDivElement | null>;
  customPosition?: { x: number; y: number };
  defaultX: number;
  defaultY: number;
  onPositionChange: (slotIndex: number, x: number, y: number) => void;
}

function DraggableSlot({
  drawingActive,
  fieldRef,
  customPosition,
  defaultX,
  defaultY,
  onPositionChange,
  ...slotProps
}: DraggableSlotProps) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  // Reset motion offset whenever customPosition is externally cleared (e.g. formation change)
  useEffect(() => {
    if (!customPosition) {
      mx.set(0);
      my.set(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customPosition]);

  // Reset offset when drawing mode activates (prevent accidental drag while drawing)
  useEffect(() => {
    if (drawingActive) {
      mx.set(0);
      my.set(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawingActive]);

  // Drag is allowed whenever: not in drawing mode, not readOnly, and slot has a player
  const canDrag = !drawingActive && !slotProps.readOnly && !!slotProps.selectedPlayerId;

  const handleDragEnd = () => {
    const fieldEl = fieldRef.current;
    if (!fieldEl) return;
    const rect = fieldEl.getBoundingClientRect();
    const naturalPx = { x: (defaultX / 100) * rect.width, y: (defaultY / 100) * rect.height };
    const finalPx   = { x: naturalPx.x + mx.get(), y: naturalPx.y + my.get() };
    const finalPct  = {
      x: Math.min(97, Math.max(3,  (finalPx.x / rect.width)  * 100)),
      y: Math.min(95, Math.max(5,  (finalPx.y / rect.height) * 100)),
    };
    mx.set(0);
    my.set(0);
    onPositionChange(slotProps.slotIndex, finalPct.x, finalPct.y);
  };

  const displayX = customPosition?.x ?? defaultX;
  const displayY = customPosition?.y ?? defaultY;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${displayX}%`,
        top:  `${displayY}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: canDrag ? 50 : 10,
        pointerEvents: 'auto',
      }}
    >
      <motion.div
        drag={canDrag}
        dragConstraints={fieldRef}
        dragElastic={0}
        dragMomentum={false}
        style={{ x: mx, y: my, cursor: canDrag ? 'grab' : undefined }}
        whileDrag={{ scale: 1.12, filter: 'drop-shadow(0 0 14px rgba(214,161,30,0.85))', cursor: 'grabbing' }}
        onDragEnd={handleDragEnd}
      >
        <FieldSlot {...slotProps} x={displayX} y={displayY} />
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campo de futebol visual
// ---------------------------------------------------------------------------

function SoccerField({ children, fieldRef }: { children: React.ReactNode; fieldRef?: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div style={{ perspective: '1100px', perspectiveOrigin: '50% 30%' }}>
      <div
        style={{
          position: 'absolute', inset: 0,
          transform: 'rotateX(18deg) translateY(10px) scaleY(0.14)',
          transformOrigin: 'center bottom',
          background: 'rgba(0,0,0,0.45)',
          borderRadius: '18px',
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />
      <div
        ref={fieldRef}
        data-field-inner
        className="relative w-full select-none"
        style={{
          aspectRatio: '16 / 6.5',
          transform: 'rotateX(18deg)',
          transformOrigin: 'center top',
          transformStyle: 'preserve-3d',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 28px 60px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(255,255,255,0.06)',
          background: '#1d6b30',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `repeating-linear-gradient(
              to right,
              rgba(0,0,0,0.0)   0px, rgba(0,0,0,0.0)   36px,
              rgba(0,0,0,0.10)  36px, rgba(0,0,0,0.10)  72px
            )`,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.15) 0%, transparent 40%, rgba(255,255,255,0.03) 100%)' }}
        />
        <div className="absolute inset-[3%] border-2 border-white/25 rounded-sm pointer-events-none" />
        <div className="absolute border-l-2 border-white/25 pointer-events-none" style={{ left: '50%', top: '3%', bottom: '3%' }} />
        <div
          className="absolute border-2 border-white/25 rounded-full pointer-events-none"
          style={{ width: '14%', aspectRatio: '1/1', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }}
        />
        <div className="absolute w-1.5 h-1.5 bg-white/35 rounded-full pointer-events-none" style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
        <div className="absolute border-2 border-white/25 pointer-events-none" style={{ width: '16%', height: '55%', left: '3%', top: '22.5%', borderLeft: 'none' }} />
        <div className="absolute border-2 border-white/25 pointer-events-none" style={{ width: '7%', height: '32%', left: '3%', top: '34%', borderLeft: 'none' }} />
        <div className="absolute border-2 border-white/20 pointer-events-none" style={{ width: '5%', height: '22%', left: '19%', top: '39%', borderRadius: '0 50% 50% 0', borderLeft: 'none' }} />
        <div className="absolute w-1.5 h-1.5 bg-white/35 rounded-full pointer-events-none" style={{ left: '13%', top: '50%', transform: 'translate(-50%,-50%)' }} />
        <div className="absolute border-2 border-white/25 pointer-events-none" style={{ width: '16%', height: '55%', right: '3%', top: '22.5%', borderRight: 'none' }} />
        <div className="absolute border-2 border-white/25 pointer-events-none" style={{ width: '7%', height: '32%', right: '3%', top: '34%', borderRight: 'none' }} />
        <div className="absolute border-2 border-white/20 pointer-events-none" style={{ width: '5%', height: '22%', right: '19%', top: '39%', borderRadius: '50% 0 0 50%', borderRight: 'none' }} />
        <div className="absolute w-1.5 h-1.5 bg-white/35 rounded-full pointer-events-none" style={{ right: '13%', top: '50%', transform: 'translate(50%,-50%)' }} />
        {children}
      </div>
      <div
        style={{
          height: '5px',
          background: 'linear-gradient(to bottom, #145220, #0d3a17)',
          borderRadius: '0 0 8px 8px',
          transform: 'rotateX(18deg) translateY(-3px)',
          transformOrigin: 'center top',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// generateLineupImage — desenha infográfico esportivo no Canvas 2D
// ---------------------------------------------------------------------------

interface LineupPlayerInfo {
  name: string;
  position: string;
  avatar: string | null;
  x: number; // 0–100 (formations.ts)
  y: number; // 0–100 (formations.ts)
}

async function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function generateLineupImage(
  teamName: string,
  teamLogo: string | null,
  formation: string,
  players: LineupPlayerInfo[],
  opponentName?: string,
): Promise<void> {
  // ── Dimensões do canvas ────────────────────────────────────────────────────
  const W = 1080;
  const H = 1350;

  const canvas  = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx     = canvas.getContext('2d')!;

  // ── Fundo escuro degradê ───────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0,   '#0a0f14');
  bgGrad.addColorStop(0.5, '#091a10');
  bgGrad.addColorStop(1,   '#050c08');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Campo de futebol flat (sem perspectiva, perfeito para imagem) ──────────
  const FIELD_MARGIN_X = 60;
  const HEADER_H       = 200;
  const FOOTER_H       = 100;
  const FIELD_X        = FIELD_MARGIN_X;
  const FIELD_Y        = HEADER_H;
  const FIELD_W        = W - FIELD_MARGIN_X * 2;
  const FIELD_H        = H - HEADER_H - FOOTER_H;

  // Grama base
  const grassGrad = ctx.createLinearGradient(FIELD_X, FIELD_Y, FIELD_X, FIELD_Y + FIELD_H);
  grassGrad.addColorStop(0,   '#1a6b2f');
  grassGrad.addColorStop(0.5, '#155a27');
  grassGrad.addColorStop(1,   '#1a6b2f');
  ctx.fillStyle = grassGrad;
  ctx.beginPath();
  ctx.roundRect(FIELD_X, FIELD_Y, FIELD_W, FIELD_H, 16);
  ctx.fill();

  // Listras do gramado
  const stripeW = FIELD_W / 12;
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(FIELD_X + i * stripeW, FIELD_Y, stripeW, FIELD_H);
  }

  // Borda do campo
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth   = 2.5;
  const bm = 20; // border margin
  ctx.strokeRect(FIELD_X + bm, FIELD_Y + bm, FIELD_W - bm * 2, FIELD_H - bm * 2);

  // Linha central
  ctx.beginPath();
  ctx.moveTo(FIELD_X + FIELD_W / 2, FIELD_Y + bm);
  ctx.lineTo(FIELD_X + FIELD_W / 2, FIELD_Y + FIELD_H - bm);
  ctx.stroke();

  // Círculo central
  ctx.beginPath();
  ctx.arc(FIELD_X + FIELD_W / 2, FIELD_Y + FIELD_H / 2, FIELD_H * 0.12, 0, Math.PI * 2);
  ctx.stroke();

  // Ponto central
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.arc(FIELD_X + FIELD_W / 2, FIELD_Y + FIELD_H / 2, 5, 0, Math.PI * 2);
  ctx.fill();

  // Área grande defesa (esquerda)
  const agW = FIELD_W * 0.16;
  const agH = FIELD_H * 0.55;
  ctx.strokeStyle = 'rgba(255,255,255,0.30)';
  ctx.strokeRect(FIELD_X + bm, FIELD_Y + FIELD_H / 2 - agH / 2, agW, agH);

  // Área pequena defesa
  const apW = FIELD_W * 0.07;
  const apH = FIELD_H * 0.32;
  ctx.strokeRect(FIELD_X + bm, FIELD_Y + FIELD_H / 2 - apH / 2, apW, apH);

  // Área grande ataque (direita)
  ctx.strokeRect(FIELD_X + FIELD_W - bm - agW, FIELD_Y + FIELD_H / 2 - agH / 2, agW, agH);

  // Área pequena ataque
  ctx.strokeRect(FIELD_X + FIELD_W - bm - apW, FIELD_Y + FIELD_H / 2 - apH / 2, apW, apH);

  // ── Cabeçalho ─────────────────────────────────────────────────────────────
  // Linha dourada no topo
  const goldGrad = ctx.createLinearGradient(0, 0, W, 0);
  goldGrad.addColorStop(0,   'transparent');
  goldGrad.addColorStop(0.3, '#D6A11E');
  goldGrad.addColorStop(0.7, '#D6A11E');
  goldGrad.addColorStop(1,   'transparent');
  ctx.fillStyle = goldGrad;
  ctx.fillRect(0, 0, W, 3);

  // Logo do time
  const LOGO_SIZE = 72;
  const LOGO_X    = W / 2 - LOGO_SIZE / 2;
  const LOGO_Y    = 20;

  if (teamLogo) {
    const logoImg = await loadImage(teamLogo);
    if (logoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(LOGO_X + LOGO_SIZE / 2, LOGO_Y + LOGO_SIZE / 2, LOGO_SIZE / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logoImg, LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE);
      ctx.restore();
    } else {
      drawTeamLogoPlaceholder(ctx, LOGO_X, LOGO_Y, LOGO_SIZE, teamName);
    }
  } else {
    drawTeamLogoPlaceholder(ctx, LOGO_X, LOGO_Y, LOGO_SIZE, teamName);
  }

  // Nome do time
  ctx.fillStyle   = '#FFFFFF';
  ctx.font        = 'bold 36px system-ui, -apple-system, sans-serif';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(teamName.toUpperCase(), W / 2, LOGO_Y + LOGO_SIZE + 10);

  // Subtítulo: formação + adversário
  ctx.fillStyle = '#D6A11E';
  ctx.font      = '500 18px system-ui, -apple-system, sans-serif';
  const subtitle = opponentName
    ? `ESCALAÇÃO · ${formation} · vs ${opponentName.toUpperCase()}`
    : `ESCALAÇÃO DA TEMPORADA · ${formation} · ${new Date().getFullYear()}`;
  ctx.fillText(subtitle, W / 2, LOGO_Y + LOGO_SIZE + 52);

  // ── Jogadores no campo ────────────────────────────────────────────────────
  const CIRCLE_R  = 38;
  const IMG_R     = 30;

  // Avatares pré-carregados
  const avatarImgs: (HTMLImageElement | null)[] = await Promise.all(
    players.map((p) => (p.avatar ? loadImage(p.avatar) : Promise.resolve(null)))
  );

  for (let i = 0; i < players.length; i++) {
    const p   = players[i];
    const img = avatarImgs[i];

    // As coordenadas x/y de formations.ts têm:
    //   x: 0 = GK (esquerda no campo DOM), 100 = ataque (direita)
    //   y: 0 = topo, 100 = base
    // Na imagem, campo va de FIELD_X+bm até FIELD_X+FIELD_W-bm
    const px = FIELD_X + bm + (p.x / 100) * (FIELD_W - bm * 2);
    const py = FIELD_Y + bm + (p.y / 100) * (FIELD_H - bm * 2);

    // Sombra do círculo
    ctx.save();
    ctx.shadowColor   = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur    = 12;
    ctx.shadowOffsetY = 4;

    // Círculo de fundo (dourado)
    const circleGrad = ctx.createRadialGradient(px, py - 8, 2, px, py, CIRCLE_R);
    circleGrad.addColorStop(0, '#e8b224');
    circleGrad.addColorStop(1, '#a07010');
    ctx.fillStyle = circleGrad;
    ctx.beginPath();
    ctx.arc(px, py, CIRCLE_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Borda branca do círculo
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(px, py, CIRCLE_R, 0, Math.PI * 2);
    ctx.stroke();

    // Avatar ou placeholder com silhueta
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, IMG_R, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, px - IMG_R, py - IMG_R, IMG_R * 2, IMG_R * 2);
      ctx.restore();
    } else {
      // Silhueta de jogador
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, IMG_R, 0, Math.PI * 2);
      ctx.clip();
      // Fundo
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(px - IMG_R, py - IMG_R, IMG_R * 2, IMG_R * 2);
      // Cabeça da silhueta
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(px, py - 10, 10, 0, Math.PI * 2);
      ctx.fill();
      // Corpo da silhueta
      ctx.beginPath();
      ctx.ellipse(px, py + 16, 14, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Badge de posição (acima do círculo)
    const badgeW = 42;
    const badgeH = 18;
    const badgeX = px - badgeW / 2;
    const badgeY = py - CIRCLE_R - badgeH - 4;
    ctx.fillStyle = '#0a0f14';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5);
    ctx.fill();
    ctx.strokeStyle = '#D6A11E';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5);
    ctx.stroke();
    ctx.fillStyle    = '#D6A11E';
    ctx.font         = 'bold 11px system-ui, -apple-system, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.position, px, badgeY + badgeH / 2);

    // Nome do jogador (abaixo do círculo)
    const firstName = p.name.split(' ')[0];
    ctx.fillStyle    = '#FFFFFF';
    ctx.font         = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';

    // Sombra no texto para legibilidade
    ctx.shadowColor   = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur    = 6;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(firstName.length > 10 ? firstName.slice(0, 9) + '…' : firstName, px, py + CIRCLE_R + 6);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
  }

  // ── Rodapé ────────────────────────────────────────────────────────────────
  // Linha dourada separadora
  ctx.fillStyle = goldGrad;
  ctx.fillRect(0, H - FOOTER_H, W, 2);

  // Branding
  ctx.fillStyle    = 'rgba(255,255,255,0.3)';
  ctx.font         = '500 15px system-ui, -apple-system, sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('FNC — Federação Nacional de Clubs', FIELD_X, H - FOOTER_H / 2);

  ctx.fillStyle = 'rgba(214,161,30,0.6)';
  ctx.textAlign = 'right';
  ctx.fillText(formatToday(), W - FIELD_X, H - FOOTER_H / 2);

  // ── Download ──────────────────────────────────────────────────────────────
  const link    = document.createElement('a');
  link.download = `escalacao-${teamName.toLowerCase().replace(/\s+/g, '-')}.png`;
  link.href     = canvas.toDataURL('image/png');
  link.click();
}

function drawTeamLogoPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  teamName: string,
) {
  // Círculo dourado com inicial do time
  const grad = ctx.createRadialGradient(x + size / 2, y + size / 2, 4, x + size / 2, y + size / 2, size / 2);
  grad.addColorStop(0, '#e8b224');
  grad.addColorStop(1, '#a07010');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle    = '#000';
  ctx.font         = `bold ${size * 0.45}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((teamName[0] ?? '?').toUpperCase(), x + size / 2, y + size / 2);
}

// ---------------------------------------------------------------------------
// AdversarySlot — mostra jogador adversário no campo (vermelho, não clicável)
// ---------------------------------------------------------------------------

interface AdversarySlotProps {
  position: string;
  x: number;
  y: number;
  playerName: string;
}

function AdversarySlot({ position, x, y, playerName }: AdversarySlotProps) {
  const firstName = playerName.split(' ')[0];
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left:      `${x}%`,
        top:       `${y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex:    5,
      }}
    >
      <div className="flex flex-col items-center gap-0.5" style={{ transform: 'rotateX(-18deg)' }}>
        <div
          className="w-11 h-11 rounded-full border-2 flex items-center justify-center shadow-lg"
          style={{ background: 'rgba(220,38,38,0.7)', borderColor: '#ef4444', boxShadow: '0 0 10px rgba(239,68,68,0.4)' }}
        >
          <User className="w-5 h-5 text-white" />
        </div>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded leading-none"
          style={{ background: '#ef4444', color: 'white' }}
        >
          {position}
        </span>
        <span className="text-[9px] text-red-300 font-medium max-w-[70px] truncate text-center leading-none mt-0.5 drop-shadow">
          {firstName}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DrawingCanvas — overlay de desenho livre sobre o campo
// ---------------------------------------------------------------------------

interface DrawingCanvasProps {
  tool: DrawTool;
  color: string;
  strokes: DrawStroke[];
  onStrokesChange: (strokes: DrawStroke[]) => void;
  active: boolean;
}

function DrawingCanvas({ tool, color, strokes, onStrokesChange, active }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const currentStroke = useRef<DrawStroke | null>(null);

  // Redraw all strokes whenever they change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) {
      drawStroke(ctx, stroke, canvas.width, canvas.height);
    }
  }, [strokes]);

  function getRelativePos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): DrawPoint {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }

  function drawStroke(ctx: CanvasRenderingContext2D, stroke: DrawStroke, w: number, h: number) {
    if (stroke.points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.tool === 'eraser' ? 20 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    }
    if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * w, stroke.points[0].y * h);
      for (const pt of stroke.points.slice(1)) {
        ctx.lineTo(pt.x * w, pt.y * h);
      }
      ctx.stroke();
    } else if (stroke.tool === 'arrow') {
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1];
      const sx = start.x * w, sy = start.y * h;
      const ex = end.x * w, ey = end.y * h;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      // Arrowhead
      const angle = Math.atan2(ey - sy, ex - sx);
      const headLen = 14;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    } else if (stroke.tool === 'circle') {
      const start = stroke.points[0];
      const end = stroke.points[stroke.points.length - 1];
      const cx = (start.x + end.x) / 2 * w;
      const cy = (start.y + end.y) / 2 * h;
      const rx = Math.abs(end.x - start.x) / 2 * w;
      const ry = Math.abs(end.y - start.y) / 2 * h;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(rx, 4), Math.max(ry, 4), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!active) return;
    isDrawing.current = true;
    const pt = getRelativePos(e);
    currentStroke.current = { tool, color, points: [pt] };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!active || !isDrawing.current || !currentStroke.current) return;
    const pt = getRelativePos(e);
    currentStroke.current.points.push(pt);
    // Live preview
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) drawStroke(ctx, stroke, canvas.width, canvas.height);
    drawStroke(ctx, currentStroke.current, canvas.width, canvas.height);
  };

  const handleMouseUp = () => {
    if (!active || !isDrawing.current || !currentStroke.current) return;
    isDrawing.current = false;
    if (currentStroke.current.points.length >= 2) {
      onStrokesChange([...strokes, currentStroke.current]);
    }
    currentStroke.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={325}
      className="absolute inset-0 w-full h-full rounded-[14px]"
      style={{
        zIndex: 20,
        pointerEvents: active ? 'auto' : 'none',
        cursor: active ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'none',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    />
  );
}

// ---------------------------------------------------------------------------
// TacticalBoard — componente principal
// ---------------------------------------------------------------------------

export function TacticalBoard({ team, members, readOnly = false }: TacticalBoardProps) {
  const { showToast } = useToast();
  const queryClient  = useQueryClient();

  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [formation,       setFormation]        = useState<TacticalFormation>('4-3-3');
  const [lineup,          setLineup]           = useState<LineupState>({});
  const [openSlot,        setOpenSlot]         = useState<number | null>(null);

  // Controla se a escalação foi confirmada (libera o botão de download)
  const [lineupConfirmed,  setLineupConfirmed]  = useState(false);
  const [isGenerating,     setIsGenerating]     = useState(false);

  // Drag & drop entre slots
  const [dragSourceSlot, setDragSourceSlot]   = useState<number | null>(null);
  const [dragOverSlot,   setDragOverSlot]     = useState<number | null>(null);

  // Adversário
  const [showAdversary,  setShowAdversary]    = useState(false);

  // Desenho
  const [drawingActive,  setDrawingActive]    = useState(false);
  const [drawTool,       setDrawTool]         = useState<DrawTool>('pen');
  const [drawColor,      setDrawColor]        = useState('#D6A11E');
  const [drawStrokes,    setDrawStrokes]      = useState<DrawStroke[]>([]);

  // Posições customizadas por drag livre
  const [customPositions,  setCustomPositions]  = useState<CustomPositions>({});
  const fieldRef = useRef<HTMLDivElement>(null);
  const slots = FORMATION_POSITIONS[formation];

  const { data: matchesData, isLoading: isLoadingMatches } = useQuery({
    queryKey: ['team-scheduled-matches', team.id],
    queryFn:  () => matchesAPI.getAll({ team: team.id, status: 'SCHEDULED', ordering: 'scheduled_date' }),
    staleTime: 30_000,
  });
  const scheduledMatches = matchesData?.results ?? [];

  const { data: existingLineup, isLoading: isLoadingLineup } = useQuery({
    queryKey: ['match-lineup', selectedMatchId, team.id],
    queryFn:  () => matchLineupsAPI.get(selectedMatchId!),
    enabled:  !!selectedMatchId,
    retry:    false,
  });

  useEffect(() => {
    if (!existingLineup) { setLineup({}); return; }
    const restored: LineupState = {};
    existingLineup.players.forEach((lp) => {
      const idx = slots.findIndex(
        (s) => s.position === lp.position && Math.abs(s.x - lp.x_position) < 5 && Math.abs(s.y - lp.y_position) < 5
      );
      if (idx !== -1) restored[idx] = lp.player.id;
    });
    setLineup(restored);
    if (existingLineup.formation && AVAILABLE_FORMATIONS.includes(existingLineup.formation as TacticalFormation)) {
      setFormation(existingLineup.formation as TacticalFormation);
    }
    // Se já tem escalação salva, libera o download imediatamente
    setLineupConfirmed(true);
  }, [existingLineup]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resetar confirmação ao trocar de partida ou formação
  useEffect(() => { setLineupConfirmed(false); }, [selectedMatchId]);

  // Carregar desenhos do localStorage ao trocar de partida
  useEffect(() => {
    setDrawStrokes(loadDrawings(selectedMatchId));
  }, [selectedMatchId]);

  // Persistir desenhos no localStorage quando mudarem
  useEffect(() => {
    saveDrawings(selectedMatchId, drawStrokes);
  }, [drawStrokes, selectedMatchId]);

  // Carregar posições customizadas do localStorage ao trocar de partida
  useEffect(() => {
    setCustomPositions(loadCustomPositions(selectedMatchId));
  }, [selectedMatchId]);

  // Persistir posições customizadas no localStorage quando mudarem
  useEffect(() => {
    saveCustomPositions(selectedMatchId, customPositions);
  }, [customPositions, selectedMatchId]);

  // Quando trocar de formação, limpar posições customizadas
  useEffect(() => {
    setCustomPositions({});
  }, [formation]);

  // Escalação do adversário
  const { data: opponentLineup } = useQuery({
    queryKey: ['match-opponent-lineup', selectedMatchId],
    queryFn:  () => matchLineupsAPI.getOpponent(selectedMatchId!),
    enabled:  !!selectedMatchId && showAdversary,
    retry:    false,
  });

  const handleFormationChange = (f: TacticalFormation) => {
    setFormation(f);
    setLineup({});
    setOpenSlot(null);
    setLineupConfirmed(false);
  };
  const handleClearLineup = () => {
    setLineup({});
    setOpenSlot(null);
    setLineupConfirmed(false);
  };
  const handleSlotToggle   = useCallback((index: number) => setOpenSlot((prev) => prev === index ? null : index), []);
  const handlePlayerSelect = useCallback((idx: number, id: number | null) => setLineup((prev) => ({ ...prev, [idx]: id })), []);

  // Drag & drop handlers
  const handleDragStart = useCallback((slotIndex: number) => {
    setDragSourceSlot(slotIndex);
  }, []);
  const handleDragOver = useCallback((slotIndex: number) => {
    setDragOverSlot(slotIndex);
  }, []);
  const handleDrop = useCallback((targetIndex: number) => {
    if (dragSourceSlot === null || dragSourceSlot === targetIndex) {
      setDragSourceSlot(null);
      setDragOverSlot(null);
      return;
    }
    setLineup((prev) => {
      const next = { ...prev };
      const sourceId = prev[dragSourceSlot] ?? null;
      const targetId = prev[targetIndex] ?? null;
      next[dragSourceSlot] = targetId;
      next[targetIndex]    = sourceId;
      return next;
    });
    setDragSourceSlot(null);
    setDragOverSlot(null);
  }, [dragSourceSlot]);

  const handlePositionChange = useCallback((slotIndex: number, x: number, y: number) => {
    setCustomPositions((prev) => ({ ...prev, [slotIndex]: { x, y } }));
  }, []);

  const hasCustomPositions = Object.keys(customPositions).length > 0;
  const handleResetPositions = useCallback(() => {
    setCustomPositions({});
  }, []);

  const usedPlayerIds = new Set(Object.values(lineup).filter((id): id is number => id !== null));

  const getAvailableMembers = (slotIndex: number) => {
    const currentId = lineup[slotIndex];
    const slotPos   = slots[slotIndex]?.position;
    const available = members.filter((m) => m.is_active && (!usedPlayerIds.has(m.player.id) || m.player.id === currentId));
    const order     = { compatible: 0, acceptable: 1, incompatible: 2, none: 3 };
    return [...available].sort((a, b) =>
      order[getCompatibility(slotPos, a.player.primary_position)] -
      order[getCompatibility(slotPos, b.player.primary_position)]
    );
  };

  const filledCount       = Object.values(lineup).filter((id) => id !== null).length;
  const isComplete        = filledCount === 11 && selectedMatchId !== null;
  const incompatibleCount = slots.reduce((acc, slot, idx) => {
    const member = members.find((m) => m.player.id === lineup[idx]);
    return member && getCompatibility(slot.position, member.player.primary_position) === 'incompatible' ? acc + 1 : acc;
  }, 0);

  const selectedMatch = scheduledMatches.find((m) => m.id === selectedMatchId);
  const opponentTeam  = selectedMatch
    ? (selectedMatch.home_team?.id === team.id ? selectedMatch.away_team : selectedMatch.home_team)
    : null;

  const submitMutation = useMutation({
    mutationFn: (data: { matchId: number; payload: import('@/types').SubmitLineupRequest }) =>
      matchLineupsAPI.submit(data.matchId, data.payload),
    onSuccess: () => {
      showToast('Escalação confirmada! Notificações enviadas aos jogadores.', 'success');
      queryClient.invalidateQueries({ queryKey: ['match-lineup', selectedMatchId, team.id] });
      setLineupConfirmed(true);
    },
    onError: (error: any) => {
      showToast(
        error?.response?.data?.error || error?.response?.data?.detail || 'Erro ao salvar escalação.',
        'error'
      );
    },
  });

  const handleSubmit = () => {
    if (!isComplete || !selectedMatchId) return;
    submitMutation.mutate({
      matchId: selectedMatchId,
      payload: {
        formation,
        players: slots.map((slot, idx) => ({
          player_id:  lineup[idx]!,
          position:   slot.position,
          x_position: slot.x,
          y_position: slot.y,
        } as MatchLineupPlayerData)),
      },
    });
  };

  const handleDownloadImage = async () => {
    setIsGenerating(true);
    try {
      const playersInfo: LineupPlayerInfo[] = slots.map((slot, idx) => {
        const memberId = lineup[idx];
        const member   = memberId ? members.find((m) => m.player.id === memberId) : null;
        return {
          name:     member?.player.player_name ?? '—',
          position: slot.position,
          avatar:   member?.player.avatar ?? null,
          x:        slot.x,
          y:        slot.y,
        };
      });

      await generateLineupImage(
        team.name,
        team.logo ?? null,
        formation,
        playersInfo,
        opponentTeam?.name,
      );
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      showToast('Erro ao gerar a imagem da escalação.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const DRAW_COLORS = ['#D6A11E', '#ef4444', '#22c55e', '#3b82f6', '#ffffff', '#000000'];

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#D6A11E]/10 flex items-center justify-center">
            <Swords className="w-4 h-4 text-[#D6A11E]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Campo Tático</h3>
            <p className="text-xs text-white/40">
              {readOnly
                ? 'Visualização da escalação · Use as ferramentas de análise tática'
                : 'Escale seus jogadores e convoque o elenco para a partida'}
            </p>
          </div>
        </div>
        {!readOnly && filledCount > 0 && (
          <button
            type="button"
            onClick={handleClearLineup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpar escalação
          </button>
        )}
      </div>

      {/* Controles: Partida + Formação (apenas no modo edição) */}
      {!readOnly && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-white/60 uppercase tracking-wider">Partida</label>
            <div className="relative">
              <select
                value={selectedMatchId ?? ''}
                onChange={(e) => setSelectedMatchId(e.target.value ? Number(e.target.value) : null)}
                className="w-full appearance-none bg-[#0F1318] border border-white/[0.08] rounded-xl px-3 py-2.5 pr-9 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D6A11E]/40 focus:border-[#D6A11E]/60 transition-all"
                disabled={isLoadingMatches}
              >
                <option value="">{isLoadingMatches ? 'Carregando...' : 'Selecionar partida...'}</option>
                {scheduledMatches.map((match) => {
                  const opp  = match.home_team?.id === team.id ? match.away_team : match.home_team;
                  const date = formatDayMonth(match.scheduled_date);
                  return <option key={match.id} value={match.id}>vs {opp?.name ?? '—'} · {date}</option>;
                })}
                {!isLoadingMatches && scheduledMatches.length === 0 && <option disabled>Nenhuma partida agendada</option>}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>
            {selectedMatch && opponentTeam && (
              <p className="text-[11px] text-[#D6A11E]/80 px-1">
                {team.name} vs {opponentTeam.name} ·{' '}
                {formatDateTimeShort(selectedMatch.scheduled_date)}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-white/60 uppercase tracking-wider">Formação</label>
            <div className="relative">
              <select
                value={formation}
                onChange={(e) => handleFormationChange(e.target.value as TacticalFormation)}
                className="w-full appearance-none bg-[#0F1318] border border-white/[0.08] rounded-xl px-3 py-2.5 pr-9 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D6A11E]/40 focus:border-[#D6A11E]/60 transition-all"
              >
                {AVAILABLE_FORMATIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* Seletor de partida em modo readOnly (para carregar escalação e adversário) */}
      {readOnly && (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-white/60 uppercase tracking-wider">Partida</label>
          <div className="relative">
            <select
              value={selectedMatchId ?? ''}
              onChange={(e) => setSelectedMatchId(e.target.value ? Number(e.target.value) : null)}
              className="w-full appearance-none bg-[#0F1318] border border-white/[0.08] rounded-xl px-3 py-2.5 pr-9 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#D6A11E]/40 focus:border-[#D6A11E]/60 transition-all"
              disabled={isLoadingMatches}
            >
              <option value="">{isLoadingMatches ? 'Carregando...' : 'Selecionar partida...'}</option>
              {scheduledMatches.map((match) => {
                const opp  = match.home_team?.id === team.id ? match.away_team : match.home_team;
                const date = formatDayMonth(match.scheduled_date);
                return <option key={match.id} value={match.id}>vs {opp?.name ?? '—'} · {date}</option>;
              })}
              {!isLoadingMatches && scheduledMatches.length === 0 && <option disabled>Nenhuma partida agendada</option>}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Barra de progresso (apenas no modo edição) */}
      {!readOnly && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Jogadores escalados</span>
            <div className="flex items-center gap-3">
              {incompatibleCount > 0 && (
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {incompatibleCount} fora de posição
                </span>
              )}
              <span className={`text-xs font-bold ${filledCount === 11 ? 'text-[#D6A11E]' : 'text-white/60'}`}>
                {filledCount}/11
              </span>
            </div>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width:      `${(filledCount / 11) * 100}%`,
                background: filledCount === 11
                  ? (incompatibleCount > 0 ? '#eab308' : '#D6A11E')
                  : 'linear-gradient(90deg, #D6A11E80, #D6A11E40)',
              }}
            />
          </div>
        </div>
      )}

      {/* ── Linha 1: controles principais (sempre visíveis) ── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Toggle adversário */}
        {selectedMatchId && opponentTeam && (
          <button
            type="button"
            onClick={() => setShowAdversary((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              showAdversary
                ? 'bg-red-500/20 text-red-400 border-red-500/30'
                : 'bg-white/[0.04] text-white/50 border-white/[0.08] hover:text-white/80'
            }`}
          >
            {showAdversary ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showAdversary ? 'Ocultar' : 'Ver'} adversário
          </button>
        )}

        {/* Botão Desenhar tática */}
        <button
          type="button"
          onClick={() => setDrawingActive((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
            drawingActive
              ? 'bg-[#D6A11E]/20 text-[#D6A11E] border-[#D6A11E]/30'
              : 'bg-white/[0.04] text-white/50 border-white/[0.08] hover:text-white/80'
          }`}
        >
          <Pencil className="w-3.5 h-3.5" />
          {drawingActive ? 'Desenhar tática ✓' : 'Desenhar tática'}
        </button>

        {/* Resetar posições (aparece quando há posições customizadas e não está em modo desenho) */}
        {!readOnly && hasCustomPositions && !drawingActive && (
          <button
            type="button"
            onClick={handleResetPositions}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-all"
            title="Resetar posições para a formação original"
          >
            <Move className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Resetar posições</span>
          </button>
        )}
      </div>

      {/* ── Linha 2: ferramentas de desenho (só quando drawingActive) ── */}
      {drawingActive && (
        <div className="flex flex-wrap items-center gap-2 pl-1 border-l-2 border-[#D6A11E]/30">
          {/* Sair do desenho */}
          <button
            type="button"
            onClick={() => setDrawingActive(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white/[0.04] text-white/60 border-white/[0.08] hover:text-white/80 transition-all"
          >
            <X className="w-3.5 h-3.5" />
            Sair do desenho
          </button>

          {/* Ferramentas */}
          {([
            { id: 'pen'    as DrawTool, label: 'Caneta',   Icon: Pencil        },
            { id: 'arrow'  as DrawTool, label: 'Seta',     Icon: MousePointer  },
            { id: 'circle' as DrawTool, label: 'Círculo',  Icon: Circle        },
            { id: 'eraser' as DrawTool, label: 'Borracha', Icon: Eraser        },
          ]).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDrawTool(id)}
              title={label}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                drawTool === id
                  ? 'bg-[#D6A11E]/20 text-[#D6A11E] border-[#D6A11E]/30'
                  : 'bg-white/[0.04] text-white/50 border-white/[0.08] hover:text-white/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}

          {/* Paleta de cores */}
          <div className="flex items-center gap-1">
            {DRAW_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDrawColor(c)}
                className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  background:  c,
                  borderColor: drawColor === c ? '#fff' : 'transparent',
                }}
              />
            ))}
          </div>

          {/* Limpar desenhos */}
          {drawStrokes.length > 0 && (
            <button
              type="button"
              onClick={() => setDrawStrokes([])}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpar</span>
            </button>
          )}
        </div>
      )}

      {/* Campo tático */}
      <div className="relative max-w-3xl mx-auto overflow-x-auto">
        <div className="min-w-[600px]">
        {isLoadingLineup && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 rounded-2xl">
            <Loader2 className="w-6 h-6 text-[#D6A11E] animate-spin" />
          </div>
        )}
        <SoccerField fieldRef={fieldRef}>
          {/* Slots do time principal */}
          {slots.map((slot, idx) => (
            <DraggableSlot
              key={`${formation}-${idx}`}
              slotIndex={idx}
              position={slot.position}
              x={slot.x}
              y={slot.y}
              selectedPlayerId={lineup[idx] ?? null}
              availableMembers={readOnly ? [] : getAvailableMembers(idx)}
              allMembers={members}
              isOpen={!readOnly && !drawingActive && openSlot === idx}
              readOnly={readOnly || drawingActive}
              isDragOver={dragOverSlot === idx}
              onToggle={handleSlotToggle}
              onSelect={handlePlayerSelect}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              drawingActive={drawingActive}
              fieldRef={fieldRef}
              customPosition={customPositions[idx]}
              defaultX={slot.x}
              defaultY={slot.y}
              onPositionChange={handlePositionChange}
            />
          ))}

          {/* Slots do adversário */}
          {showAdversary && opponentLineup?.players.map((lp, idx) => (
            <AdversarySlot
              key={`adv-${idx}`}
              position={lp.position}
              x={lp.x_position}
              y={lp.y_position}
              playerName={lp.player.player_name}
            />
          ))}

          {/* Canvas de desenho */}
          <DrawingCanvas
            tool={drawTool}
            color={drawColor}
            strokes={drawStrokes}
            onStrokesChange={setDrawStrokes}
            active={drawingActive}
          />
        </SoccerField>
        <div className="flex justify-between mt-3 px-1">
          <span className="text-[10px] text-white/30 uppercase tracking-widest">◀ GK / Defesa</span>
          <span className="text-[10px] text-white/30 uppercase tracking-widest">Ataque ▶</span>
        </div>
        </div>
        {drawingActive && (
          <p className="text-center text-[10px] text-[#D6A11E]/60 mt-1">
            Modo desenho ativo — seus rabiscos ficam salvos localmente · jogadores bloqueados temporariamente
          </p>
        )}
        {!readOnly && !drawingActive && filledCount > 0 && (
          <p className="text-center text-[10px] text-white/30 mt-1">
            Arraste jogadores para reposicionar · Arraste entre slots para trocar posições
          </p>
        )}
        {!readOnly && !drawingActive && filledCount === 0 && (
          <p className="text-center text-[10px] text-white/20 mt-1">
            Escale jogadores nos slots para começar
          </p>
        )}
      </div>

      {/* Avisos (apenas no modo edição) */}
      {!readOnly && !selectedMatchId && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-yellow-500/[0.08] border border-yellow-500/20 rounded-xl">
          <span className="text-yellow-400 text-xs">Selecione uma partida antes de confirmar a escalação.</span>
        </div>
      )}
      {!readOnly && incompatibleCount > 0 && filledCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-red-500/[0.08] border border-red-500/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-red-400 text-xs">
            {incompatibleCount} jogador{incompatibleCount !== 1 ? 'es estão' : ' está'} fora da posição ideal.
          </span>
        </div>
      )}

      {/* Aviso modo readOnly — escalação não confirmada */}
      {readOnly && selectedMatchId && !isLoadingLineup && filledCount === 0 && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl">
          <span className="text-white/40 text-xs">Nenhuma escalação confirmada pelo dono para esta partida ainda.</span>
        </div>
      )}

      {/* Botões de ação: Confirmar + Baixar (apenas no modo edição) */}
      {!readOnly && (
        <div className="space-y-2">
          {/* Confirmar escalação */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isComplete || submitMutation.isPending}
            className={`
              w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl
              text-sm font-bold tracking-wide transition-all duration-200
              ${isComplete && !submitMutation.isPending
                ? 'bg-[#D6A11E] text-black hover:bg-[#e8b224] hover:shadow-[0_0_20px_rgba(214,161,30,0.4)] active:scale-[0.98]'
                : 'bg-white/[0.04] text-white/30 cursor-not-allowed border border-white/[0.06]'
              }
            `}
          >
            {submitMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Enviando...</>
            ) : isComplete ? (
              <><Check className="w-4 h-4" />Confirmar Escalação e Convocar</>
            ) : (
              <><Swords className="w-4 h-4" />{!selectedMatchId ? 'Selecione uma partida' : `Escale mais ${11 - filledCount} jogador${11 - filledCount !== 1 ? 'es' : ''}`}</>
            )}
          </button>

          {/* Baixar escalação — aparece após confirmação */}
          {lineupConfirmed && (
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isGenerating}
              className={`
                w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl
                text-sm font-bold tracking-wide border transition-all duration-200
                ${isGenerating
                  ? 'bg-white/[0.04] text-white/30 border-white/[0.06] cursor-not-allowed'
                  : 'bg-transparent text-[#D6A11E] border-[#D6A11E]/50 hover:bg-[#D6A11E]/10 hover:border-[#D6A11E] active:scale-[0.98]'
                }
              `}
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Gerando imagem...</>
              ) : (
                <><ImageIcon className="w-4 h-4" />Baixar Escalação como Imagem</>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
