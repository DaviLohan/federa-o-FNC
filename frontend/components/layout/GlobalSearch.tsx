'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2, Users, Trophy, Calendar, User } from 'lucide-react';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import Link from 'next/link';

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { query, setQuery, results, totalResults, isLoading, isSearching } = useGlobalSearch();

  // Abrir modal com Ctrl+K ou Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focar input quando abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* Search Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface1 px-3 py-2 text-sm text-muted transition-colors hover:border-gold/30 hover:text-text"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden rounded bg-surface2 px-2 py-0.5 text-xs text-muted lg:inline">
          ⌘K
        </kbd>
      </button>

      {/* Search Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20 backdrop-blur-sm">
          <div
            ref={containerRef}
            className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-surface1 shadow-2xl"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 border-b border-border p-4">
              <Search className="h-5 w-5 text-gold" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar times, jogadores, campeonatos..."
                className="flex-1 bg-transparent text-text outline-none placeholder:text-muted"
              />
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gold" />}
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="rounded p-1 text-muted transition-colors hover:bg-surface2 hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto p-2">
              {query.length < 2 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="mb-3 h-12 w-12 text-muted" />
                  <p className="text-sm text-muted">
                    Digite pelo menos 2 caracteres para buscar
                  </p>
                  <p className="mt-1 text-xs text-muted/70">
                    Times, jogadores, campeonatos e partidas
                  </p>
                </div>
              ) : isSearching || isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gold" />
                </div>
              ) : totalResults === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="mb-3 h-12 w-12 text-muted" />
                  <p className="text-sm text-muted">Nenhum resultado encontrado</p>
                  <p className="mt-1 text-xs text-muted/70">
                    Tente buscar por outro termo
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Times */}
                  {results.teams.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase text-muted">
                        <Users className="h-3 w-3" />
                        <span>Times ({results.teams.length})</span>
                      </div>
                      <div className="space-y-1">
                        {results.teams.map((team: any) => (
                          <Link
                            key={team.id}
                            href={`/teams/${team.id}`}
                            onClick={handleClose}
                            className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-surface2"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 font-bold text-gold">
                              {team.abbreviation}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-text">{team.name}</p>
                              <p className="text-xs text-muted">{team.abbreviation}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Jogadores */}
                  {results.players.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase text-muted">
                        <User className="h-3 w-3" />
                        <span>Jogadores ({results.players.length})</span>
                      </div>
                      <div className="space-y-1">
                        {results.players.map((player: any) => (
                          <Link
                            key={player.id}
                            href={`/players/${player.id}`}
                            onClick={handleClose}
                            className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-surface2"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10 font-bold text-warning">
                              {player.gamertag?.[0] || player.user?.username?.[0] || '?'}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-text">
                                {player.gamertag || player.user?.username}
                              </p>
                              <p className="text-xs text-muted">
                                {player.user?.first_name} {player.user?.last_name}
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Campeonatos */}
                  {results.championships.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase text-muted">
                        <Trophy className="h-3 w-3" />
                        <span>Campeonatos ({results.championships.length})</span>
                      </div>
                      <div className="space-y-1">
                        {results.championships.map((championship: any) => (
                          <Link
                            key={championship.id}
                            href={`/championships/${championship.id}`}
                            onClick={handleClose}
                            className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-surface2"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
                              <Trophy className="h-5 w-5 text-gold" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-text">{championship.name}</p>
                              <p className="text-xs text-muted">{championship.format}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Partidas */}
                  {results.matches.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase text-muted">
                        <Calendar className="h-3 w-3" />
                        <span>Partidas ({results.matches.length})</span>
                      </div>
                      <div className="space-y-1">
                        {results.matches.map((match: any) => (
                          <Link
                            key={match.id}
                            href={`/matches/${match.id}`}
                            onClick={handleClose}
                            className="flex items-center gap-3 rounded-lg p-3 transition-colors hover:bg-surface2"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green/10">
                              <Calendar className="h-5 w-5 text-green" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-text">
                                {match.team_a?.name} vs {match.team_b?.name}
                              </p>
                              <p className="text-xs text-muted">{match.championship?.name}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border px-4 py-2 text-center text-xs text-muted">
              <kbd className="rounded bg-surface2 px-2 py-1">ESC</kbd> para fechar
            </div>
          </div>
        </div>
      )}
    </>
  );
}
