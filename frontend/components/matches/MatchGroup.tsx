'use client';

import Link from 'next/link';
import { Trophy, Handshake } from 'lucide-react';
import type { Match } from '@/types';
import { MatchCard } from './MatchCard';

interface MatchGroupProps {
  championship: { id: number; name: string; logo?: string } | null;
  matches: Match[];
  onDetails: (m: Match) => void;
  onStart: (m: Match) => void;
  onReportEA: (m: Match) => void;
  onReportManual: (m: Match) => void;
  onContest: (m: Match) => void;
}

export function MatchGroup({ championship, matches, ...handlers }: MatchGroupProps) {
  if (matches.length === 0) return null;

  return (
    <section className="space-y-3">
      {/* Cabeçalho do campeonato */}
      <div className="flex items-center gap-2.5">
        {championship ? (
          championship.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={championship.logo} alt={championship.name} className="h-7 w-7 rounded-lg object-cover" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold">
              <Trophy className="h-4 w-4" />
            </span>
          )
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-stroke bg-panel2 text-muted2">
            <Handshake className="h-4 w-4" />
          </span>
        )}

        {championship ? (
          <Link
            href={`/championships/${championship.id}`}
            className="font-heading text-sm font-bold uppercase tracking-wide text-text transition-colors hover:text-gold"
          >
            {championship.name}
          </Link>
        ) : (
          <span className="font-heading text-sm font-bold uppercase tracking-wide text-muted2">Amistosos</span>
        )}

        <span className="rounded-full border border-stroke bg-panel2 px-2 py-0.5 font-mono text-[10px] font-semibold text-muted2">
          {matches.length}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-gold/20 to-transparent" />
      </div>

      <div className="space-y-3">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onDetails={handlers.onDetails}
            onStart={handlers.onStart}
            onReportEA={handlers.onReportEA}
            onReportManual={handlers.onReportManual}
            onContest={handlers.onContest}
          />
        ))}
      </div>
    </section>
  );
}
