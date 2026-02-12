import { useQuery } from '@tanstack/react-query';
import { searchAPI } from '@/lib/api';
import { useState, useEffect } from 'react';

/**
 * Hook para busca global com debounce
 */
export function useGlobalSearch(initialQuery = '', limit = 5) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Debounce: aguardar 300ms após a última digitação
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Buscar apenas se tiver pelo menos 2 caracteres
  const { data, isLoading, error } = useQuery({
    queryKey: ['search', debouncedQuery, limit],
    queryFn: () => searchAPI.global(debouncedQuery, limit),
    enabled: debouncedQuery.length >= 2,
  });

  const results = (data as any)?.results || { teams: [], players: [], championships: [], matches: [] };
  const totalResults = (data as any)?.total || 0;

  return {
    query,
    setQuery,
    results,
    totalResults,
    isLoading,
    error,
    isSearching: query !== debouncedQuery, // Usuário ainda está digitando
  };
}
