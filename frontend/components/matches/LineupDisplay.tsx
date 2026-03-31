'use client';

/**
 * LineupDisplay.tsx
 *
 * Exibe a escalação do time do usuário em uma partida — modo leitura (read-only).
 * Renderiza um campo de futebol visual com os jogadores posicionados.
 * Usado na página /matches/[id].
 */

import { useQuery } from '@tanstack/react-query';
import { matchLineupsAPI } from '@/lib/api';
import { Loader2, Users } from 'lucide-react';
import type { MatchLineup, MatchLineupPlayer } from '@/types';

// ---------------------------------------------------------------------------
// Campo de futebol (read-only — sem interatividade)
// ---------------------------------------------------------------------------

function SoccerFieldReadOnly({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full max-h-[70vh] sm:max-h-none select-none overflow-hidden rounded-2xl border border-white/[0.06]"
      style={{ aspectRatio: '3 / 4.2', background: '#1a5c2b' }}
    >
      {/* Listras de gramado */}
      <div
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(
            to bottom,
            rgba(0,0,0,0.06) 0px,
            rgba(0,0,0,0.06) 1px,
            transparent 1px,
            transparent 40px
          )`,
        }}
      />

      {/* Linha do meio-campo */}
      <div className="absolute left-0 right-0 border-t-2 border-white/20" style={{ top: '50%' }} />

      {/* Círculo central */}
      <div
        className="absolute border-2 border-white/20 rounded-full"
        style={{
          width: '22%',
          paddingBottom: '22%',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Ponto central */}
      <div
        className="absolute w-1.5 h-1.5 bg-white/30 rounded-full"
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      />

      {/* Área grande — defesa (topo) */}
      <div
        className="absolute border-2 border-white/20"
        style={{ width: '50%', height: '16%', top: 0, left: '25%', borderTop: 'none' }}
      />

      {/* Área pequena — defesa (topo) */}
      <div
        className="absolute border-2 border-white/20"
        style={{ width: '26%', height: '7%', top: 0, left: '37%', borderTop: 'none' }}
      />

      {/* Ponto pênalti — defesa */}
      <div
        className="absolute w-1.5 h-1.5 bg-white/30 rounded-full"
        style={{ top: '12%', left: '50%', transform: 'translate(-50%, -50%)' }}
      />

      {/* Área grande — ataque (base) */}
      <div
        className="absolute border-2 border-white/20"
        style={{ width: '50%', height: '16%', bottom: 0, left: '25%', borderBottom: 'none' }}
      />

      {/* Área pequena — ataque (base) */}
      <div
        className="absolute border-2 border-white/20"
        style={{ width: '26%', height: '7%', bottom: 0, left: '37%', borderBottom: 'none' }}
      />

      {/* Ponto pênalti — ataque */}
      <div
        className="absolute w-1.5 h-1.5 bg-white/30 rounded-full"
        style={{ bottom: '12%', left: '50%', transform: 'translate(-50%, -50%)' }}
      />

      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Marcador de jogador no campo
// ---------------------------------------------------------------------------

function PlayerMarker({ lp }: { lp: MatchLineupPlayer }) {
  const initials = (lp.player.player_name || '??')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const firstName = lp.player.player_name.split(' ')[0];

  return (
    <div
      className="absolute"
      style={{
        left: `${lp.x_position}%`,
        top: `${lp.y_position}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: 10,
      }}
    >
      <div className="flex flex-col items-center gap-0.5">
        {/* Círculo */}
        <div className="w-10 h-10 rounded-full bg-[#D6A11E] border-2 border-[#D6A11E] shadow-[0_0_10px_rgba(214,161,30,0.5)] flex items-center justify-center">
          {lp.player.avatar ? (
            <img
              src={lp.player.avatar}
              alt={lp.player.player_name}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <span className="text-xs font-bold text-black leading-none">{initials}</span>
          )}
        </div>

        {/* Badge de posição */}
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded leading-none bg-[#D6A11E] text-black">
          {lp.position}
        </span>

        {/* Nome */}
        <span className="text-[8px] text-white/90 font-medium max-w-[68px] truncate text-center leading-none mt-0.5 drop-shadow">
          {firstName}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lista de jogadores (coluna lateral)
// ---------------------------------------------------------------------------

function PlayerList({ lineup }: { lineup: MatchLineup }) {
  // Agrupa por posição para exibir organizado
  const grouped: Record<string, MatchLineupPlayer[]> = {};
  for (const lp of lineup.players) {
    if (!grouped[lp.position]) grouped[lp.position] = [];
    grouped[lp.position].push(lp);
  }

  return (
    <div className="space-y-2">
      {lineup.players.map((lp, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05]"
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-[#D6A11E]/20 border border-[#D6A11E]/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {lp.player.avatar ? (
              <img
                src={lp.player.avatar}
                alt={lp.player.player_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[10px] font-bold text-[#D6A11E]">
                {(lp.player.player_name || '??')
                  .split(' ')
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()}
              </span>
            )}
          </div>

          {/* Nome */}
          <span className="text-sm text-white flex-1 truncate">{lp.player.player_name}</span>

          {/* Posição */}
          <span className="text-[10px] font-bold text-[#D6A11E] bg-[#D6A11E]/10 px-2 py-0.5 rounded flex-shrink-0">
            {lp.position}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

interface LineupDisplayProps {
  matchId: number;
}

export function LineupDisplay({ matchId }: LineupDisplayProps) {
  const { data: lineup, isLoading, isError } = useQuery<MatchLineup>({
    queryKey: ['match-lineup-display', matchId],
    queryFn: () => matchLineupsAPI.get(matchId),
    retry: false, // 404 esperado quando não há escalação ou usuário não é do time
  });

  // --- Carregando ---
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 gap-3 text-white/40">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Carregando escalação...</span>
      </div>
    );
  }

  // --- Sem escalação (404 ou usuário não é do time) ---
  if (isError || !lineup) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-white/40">
        <Users className="w-8 h-8" />
        <p className="text-sm">Nenhuma escalação confirmada ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho: time + formação */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {lineup.team.logo && (
            <img
              src={lineup.team.logo}
              alt={lineup.team.name}
              className="w-6 h-6 rounded-full object-cover"
            />
          )}
          <span className="text-sm font-semibold text-white">{lineup.team.name}</span>
        </div>
        <span className="text-xs font-bold text-[#D6A11E] bg-[#D6A11E]/10 px-3 py-1 rounded-full border border-[#D6A11E]/20">
          {lineup.formation}
        </span>
      </div>

      {/* Campo + lista de jogadores lado a lado em telas maiores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Campo visual */}
        <div>
          <SoccerFieldReadOnly>
            {lineup.players.map((lp, i) => (
              <PlayerMarker key={i} lp={lp} />
            ))}
          </SoccerFieldReadOnly>
          <div className="flex justify-between mt-1 px-1">
            <span className="text-[10px] text-white/30 uppercase tracking-widest">▲ Defesa (GK)</span>
            <span className="text-[10px] text-white/30 uppercase tracking-widest">Ataque ▼</span>
          </div>
        </div>

        {/* Lista de jogadores */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
            Elenco Convocado ({lineup.players.length})
          </p>
          <PlayerList lineup={lineup} />
        </div>
      </div>

      {/* Rodapé: quem submeteu */}
      <p className="text-[11px] text-white/25 text-right">
        Escalado por {lineup.submitted_by.email}
      </p>
    </div>
  );
}
