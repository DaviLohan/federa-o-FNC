'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { statisticsAPI } from '@/lib/api';
import { SkeletonGrid } from '@/components/shared/ui';
import { RankingErrorState } from '@/components/statistics/RankingErrorState';
import { PlayerProfileHeader } from '@/components/players/PlayerProfileHeader';
import { PlayerCard } from '@/components/players/PlayerCard';
import { playerCardRowFromProfile } from '@/lib/utils/playerCard';
import { PlayerCareerStats } from '@/components/players/PlayerCareerStats';
import { PlayerEvolutionChart } from '@/components/players/PlayerEvolutionChart';
import { PlayerMatchHistory } from '@/components/players/PlayerMatchHistory';
import { PlayerChampionships } from '@/components/players/PlayerChampionships';
import { PlayerAchievements } from '@/components/players/PlayerAchievements';

export default function PlayerProfilePage() {
  const params = useParams();
  const playerId = Number(params?.id);

  const query = useQuery({
    queryKey: ['player-profile', playerId],
    queryFn: () => statisticsAPI.getPlayerProfile(playerId),
    enabled: Number.isFinite(playerId),
    refetchOnWindowFocus: false,
    retry: false,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <Link
        href="/statistics"
        className="inline-flex items-center gap-1.5 text-sm text-muted2 transition-colors hover:text-gold"
      >
        <ArrowLeft className="h-4 w-4" />
        Ranking de jogadores
      </Link>

      {query.isLoading ? (
        <SkeletonGrid count={6} />
      ) : query.isError || !query.data ? (
        <RankingErrorState onRetry={() => query.refetch()} />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,220px)_1fr] lg:items-start">
            <div className="mx-auto w-full max-w-[220px] lg:mx-0">
              <PlayerCard row={playerCardRowFromProfile(query.data)} disableLink />
            </div>
            <PlayerProfileHeader player={query.data.player} />
          </div>

          <PlayerCareerStats career={query.data.career} isGoalkeeper={query.data.player.is_goalkeeper} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PlayerEvolutionChart history={query.data.history} />
            <PlayerAchievements achievements={query.data.achievements} />
          </div>

          <PlayerChampionships items={query.data.by_championship} />

          <PlayerMatchHistory history={query.data.history} />
        </>
      )}
    </div>
  );
}
