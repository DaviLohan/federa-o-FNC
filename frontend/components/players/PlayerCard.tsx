'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import type { PlayerCardRow } from '@/lib/utils/playerCard';
import { getTierStyle, tierRgba } from '@/components/statistics/tierStyles';
import { PlayerSilhouette } from './PlayerSilhouette';

// Formato angular da carta (ombros no topo + leve afunilamento na base).
const CARD_CLIP =
  'polygon(0% 7%, 20% 7%, 28% 0%, 72% 0%, 80% 7%, 100% 7%, 100% 90%, 58% 100%, 42% 100%, 0% 90%)';

function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function fmt(value: number | null | undefined, suffix = ''): string {
  if (value === null || value === undefined) return '—';
  return `${value}${suffix}`;
}

function statsFor(row: PlayerCardRow): { label: string; value: string }[] {
  const g = row.position_group;
  const rating = row.average_rating != null ? row.average_rating.toFixed(1) : '—';
  if (g === 'GK') {
    return [
      { label: 'JOG', value: fmt(row.matches) },
      { label: 'DEF', value: fmt(row.saves) },
      { label: 'CS', value: fmt(row.clean_sheets) },
      { label: 'NOTA', value: rating },
    ];
  }
  if (g === 'DEF') {
    return [
      { label: 'JOG', value: fmt(row.matches) },
      { label: 'DES', value: row.tackle_accuracy != null ? `${Math.round(row.tackle_accuracy)}%` : '—' },
      { label: 'AST', value: fmt(row.assists) },
      { label: 'NOTA', value: rating },
    ];
  }
  if (g === 'MID') {
    return [
      { label: 'JOG', value: fmt(row.matches) },
      { label: 'GOL', value: fmt(row.goals) },
      { label: 'AST', value: fmt(row.assists) },
      { label: 'PAS', value: row.pass_accuracy != null ? `${Math.round(row.pass_accuracy)}%` : '—' },
    ];
  }
  return [
    { label: 'JOG', value: fmt(row.matches) },
    { label: 'GOL', value: fmt(row.goals) },
    { label: 'AST', value: fmt(row.assists) },
    { label: 'FIN', value: fmt(row.shots) },
  ];
}

interface PlayerCardProps {
  row: PlayerCardRow;
  footer?: ReactNode;
  href?: string;
  /** Renderiza o card estático (sem link). Útil no próprio perfil do jogador. */
  disableLink?: boolean;
}

export function PlayerCard({ row, footer, href, disableLink = false }: PlayerCardProps) {
  const tier = row.tier ?? 'BRONZE';
  const s = getTierStyle(tier);
  const stats = statsFor(row);
  const overall = row.overall ?? null;
  const link = href ?? `/players/${row.player_id}`;

  const frameStyle: CSSProperties = {
    clipPath: CARD_CLIP,
    background: `linear-gradient(150deg, ${s.solid} 0%, ${s.solid2} 50%, ${tierRgba(s.solid, 0.85)} 100%)`,
  };
  const panelStyle: CSSProperties = {
    clipPath: CARD_CLIP,
    background: `linear-gradient(160deg, ${tierRgba(s.solid2, 0.55)} 0%, rgba(10,12,18,0.92) 55%, rgba(6,8,12,0.96) 100%)`,
  };

  const wrapperClass = `group relative block w-full transition-transform duration-200 ${disableLink ? '' : 'hover:-translate-y-1'}`;
  const wrapperStyle: CSSProperties = { filter: `drop-shadow(0 6px 18px ${tierRgba(s.solid, 0.25)})` };

  // Moldura metálica + painel interno
  const cardBody = (
    <div className="relative aspect-[0.72] w-full" style={frameStyle}>
          <div className="absolute inset-[3px]" style={panelStyle}>
            {/* brilho diagonal */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                clipPath: CARD_CLIP,
                background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.10) 50%, transparent 60%)',
              }}
            />

            {/* Silhueta / avatar (corpo da carta) */}
            <div className="absolute inset-x-0 top-[8%] flex h-[64%] items-end justify-center">
              {row.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.avatar} alt={row.player_name} className="h-full w-auto max-w-[80%] object-contain object-bottom" />
              ) : (
                <PlayerSilhouette className="h-[92%] w-auto" fill={tierRgba(s.solid2, 0.85)} />
              )}
            </div>

            {/* Coluna esquerda: chevrons + overall + posição + escudo */}
            <div className="absolute left-[10%] top-[9%] flex flex-col items-center gap-1 text-white">
              <div className="flex flex-col gap-[2px]">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-[3px] w-4 -skew-x-[30deg]"
                    style={{ background: tierRgba('#ffffff', 0.55 - i * 0.12) }}
                  />
                ))}
              </div>
              <span className="font-heading text-3xl font-extrabold leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                {overall ?? '—'}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/85">
                {row.position_abbr ?? row.position ?? '—'}
              </span>
              <div className="mt-0.5 flex h-6 w-6 items-center justify-center overflow-hidden rounded-sm bg-black/25">
                {row.team?.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.team.logo} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[11px]">⚽</span>
                )}
              </div>
            </div>

            {/* Faixa do nome + tier */}
            <div
              className="absolute inset-x-[8%] top-[68%] border-y py-1 text-center"
              style={{ borderColor: tierRgba(s.solid, 0.5), background: tierRgba(s.solid2, 0.35) }}
            >
              <p className="truncate font-heading text-[13px] font-bold uppercase tracking-wide text-white">
                {row.player_name}
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em]" style={{ color: s.solid }}>
                {row.tier_label ?? s.label}
              </p>
            </div>

            {/* Base de stats */}
            <div className="absolute inset-x-[8%] top-[80%] grid grid-cols-4">
              {stats.map((st, i) => (
                <div
                  key={st.label}
                  className={`flex flex-col items-center px-0.5 leading-tight ${i > 0 ? 'border-l' : ''}`}
                  style={i > 0 ? { borderColor: tierRgba(s.solid, 0.25) } : undefined}
                >
                  <span className="font-heading text-[13px] font-bold text-white">{st.value}</span>
                  <span className="text-[8px] font-semibold uppercase tracking-wide text-white/55">{st.label}</span>
                </div>
              ))}
            </div>

            {/* chevron inferior */}
            <div
              className="absolute bottom-[3%] left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r"
              style={{ borderColor: tierRgba(s.solid, 0.6) }}
            />
          </div>
        </div>
  );

  return (
    <div className="flex flex-col">
      {disableLink ? (
        <div className={wrapperClass} style={wrapperStyle}>
          {cardBody}
        </div>
      ) : (
        <Link href={link} className={wrapperClass} style={wrapperStyle}>
          {cardBody}
        </Link>
      )}

      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
}
