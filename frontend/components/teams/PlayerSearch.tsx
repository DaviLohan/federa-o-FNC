'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { teamsAPI } from '@/lib/api';
import { Input } from '@/components/shared/ui';
import type { PlayerSearchResult } from '@/types';

interface PlayerSearchProps {
  onPlayerSelect: (player: PlayerSearchResult) => void;
  excludeIds?: number[];
  disabled?: boolean;
}

export function PlayerSearch({ onPlayerSelect, excludeIds = [], disabled = false }: PlayerSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Search query
  const { data, isLoading } = useQuery({
    queryKey: ['player-search', debouncedSearch],
    queryFn: () => teamsAPI.searchPlayers(debouncedSearch),
    enabled: debouncedSearch.length >= 2,
  });

  const players = data?.results || [];
  const filteredPlayers = players.filter(p => !excludeIds.includes(p.id));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (player: PlayerSearchResult) => {
    onPlayerSelect(player);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const getPositionEmoji = (position: string) => {
    if (position === 'GK') return '🥅';
    if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(position)) return '🛡️';
    if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(position)) return '⚙️';
    if (['LW', 'RW', 'ST', 'CF'].includes(position)) return '⚽';
    return '👤';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Input
        label="Buscar Jogador por Nome ou Gamer Tag"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder="Digite o nome ou gamer tag..."
        disabled={disabled}
      />

      {/* Dropdown */}
      {showDropdown && debouncedSearch.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 bg-surface border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-muted">
              <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-brand mr-2"></div>
              Buscando...
            </div>
          )}

          {!isLoading && filteredPlayers.length === 0 && (
            <div className="p-4 text-center text-muted">
              Nenhum jogador encontrado
            </div>
          )}

          {!isLoading && filteredPlayers.length > 0 && (
            <div className="py-2">
              {filteredPlayers.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleSelect(player)}
                  className="w-full px-4 py-3 hover:bg-surface-dark transition-colors flex items-center gap-3 text-left"
                >
                  {player.avatar ? (
                    <img
                      src={player.avatar}
                      alt={player.player_name}
                      className="w-10 h-10 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-surface-dark flex items-center justify-center text-lg">
                      {getPositionEmoji(player.primary_position)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-text">{player.player_name}</div>
                    <div className="text-sm text-muted">@{player.gamer_tag}</div>
                  </div>
                  <div className="text-xs text-muted2">
                    {getPositionEmoji(player.primary_position)} {player.primary_position}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Helper text */}
      {debouncedSearch.length < 2 && debouncedSearch.length > 0 && (
        <p className="text-xs text-muted2 mt-1">Digite ao menos 2 caracteres para buscar</p>
      )}
    </div>
  );
}
