'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useChampionship } from '@/lib/hooks';
import { usePermissions } from '@/lib/hooks';
import { TabsPremium, TabPremium, Button, Skeleton } from '@/components/shared/ui';
import { Calendar, Trophy, Users, BarChart, FileText, AlertTriangle, Eye } from 'lucide-react';
import { ChampionshipHero } from '@/components/championships/ChampionshipHero';

// Import tab components
import { OverviewTab } from '@/components/championships/tabs/OverviewTab';
import { StandingsTab } from '@/components/championships/tabs/StandingsTab';
import { MatchesTab } from '@/components/championships/tabs/MatchesTab';
import { BracketTabV2 } from '@/components/championships/tabs/BracketTabV2';
import { GroupsTab } from '@/components/championships/tabs/GroupsTab';
import { TeamsTab } from '@/components/championships/tabs/TeamsTab';
import { StatsTab } from '@/components/championships/tabs/StatsTab';
import { ReportsTab } from '@/components/championships/tabs/ReportsTab';

export default function ChampionshipDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const championshipId = parseInt(params.id as string);
  
  const [activeTab, setActiveTab] = useState('overview');
  
  const { 
    championship, 
    standings, 
    bracket, 
    matches, 
    enrollments, 
    isLoading, 
    isLoadingStandings, 
    error, 
    standingsError 
  } = useChampionship(championshipId);
  
  const { canManageChampionships, canViewReports } = usePermissions();

  if (isLoading) {
    return <ChampionshipDetailsSkeleton />;
  }

  if (error || !championship) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 reveal-fade">
          <div className="text-8xl animate-floaty">😕</div>
          <h2 className="text-3xl font-heading font-bold text-text">Campeonato não encontrado</h2>
          <p className="text-muted max-w-md mx-auto">
            O campeonato que você está procurando não existe ou foi removido.
          </p>
          <Button 
            variant="primary" 
            onClick={() => router.push('/championships')}
            className="mt-6"
          >
            Voltar para Campeonatos
          </Button>
        </div>
      </div>
    );
  }

  // Determinar quais abas mostrar baseado no tipo de campeonato
  const showGroupsTab = championship.championship_type === 'GROUPS_KNOCKOUT';
  const showBracketTab = championship.championship_type === 'GROUPS_KNOCKOUT';
  const showStandingsTab = championship.championship_type === 'LEAGUE';

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <div className="reveal-fade">
        <ChampionshipHero 
          championship={championship}
          canManage={canManageChampionships}
          onEdit={() => router.push(`/championships?edit=${championship.id}`)}
        />
      </div>

      {/* Tabs Navigation */}
      <div className="reveal-fade-delay-1">
        <TabsPremium value={activeTab} onChange={setActiveTab}>
          <TabPremium 
            value="overview" 
            label="Visão Geral" 
            icon={<Eye className="w-4 h-4" />}
          />
          
          {showGroupsTab && (
            <TabPremium 
              value="groups" 
              label="Grupos" 
              icon={<Users className="w-4 h-4" />}
            />
          )}
          
          {showBracketTab && (
            <TabPremium 
              value="bracket" 
              label="Chavamento" 
              icon={<Trophy className="w-4 h-4" />}
            />
          )}
          
          {showStandingsTab && (
            <TabPremium
              value="standings"
              label="Classificação"
              icon={<BarChart className="w-4 h-4" />}
              badge={standings.length > 0 ? standings.length : undefined}
            />
          )}
          
          <TabPremium
            value="matches"
            label="Partidas"
            icon={<Calendar className="w-4 h-4" />}
            badge={matches.length > 0 ? matches.length : undefined}
          />
          
          <TabPremium
            value="teams"
            label="Times"
            icon={<Users className="w-4 h-4" />}
            badge={championship.enrolled_teams_count}
          />
          
          <TabPremium 
            value="stats" 
            label="Estatísticas" 
            icon={<BarChart className="w-4 h-4" />}
          />
          
          {canViewReports && (
            <>
              <TabPremium 
                value="reports" 
                label="Reportes" 
                icon={<FileText className="w-4 h-4" />}
              />
              <TabPremium 
                value="contestations" 
                label="Contestações" 
                icon={<AlertTriangle className="w-4 h-4" />}
              />
            </>
          )}
        </TabsPremium>
      </div>

      {/* Tab Content */}
      <div className="reveal-fade-delay-2">
        {activeTab === 'overview' && (
          <OverviewTab championship={championship} enrollments={enrollments} />
        )}
        
        {activeTab === 'groups' && showGroupsTab && (
          <GroupsTab championship={championship} />
        )}
        
        {activeTab === 'bracket' && showBracketTab && (
          <BracketTabV2 championship={championship} bracket={bracket} matches={matches} />
        )}
        
        {activeTab === 'standings' && showStandingsTab && (
          <StandingsTab standings={standings} error={standingsError} isLoading={isLoadingStandings} />
        )}
        
        {activeTab === 'matches' && (
          <MatchesTab matches={matches} championship={championship} />
        )}
        
        {activeTab === 'teams' && (
          <TeamsTab enrollments={enrollments} championship={championship} />
        )}
        
        {activeTab === 'stats' && (
          <StatsTab championshipId={championship.id} />
        )}
        
        {activeTab === 'reports' && canViewReports && (
          <ReportsTab championshipId={championship.id} />
        )}

        {activeTab === 'contestations' && canViewReports && (
          <div className="text-center py-24 space-y-4">
            <div className="text-7xl animate-floaty">⚖️</div>
            <h3 className="text-2xl font-heading font-bold text-text">Contestações</h3>
            <p className="text-muted max-w-md mx-auto">
              Aba de contestações em desenvolvimento. Aqui serão exibidas as disputas sobre resultados de partidas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Loading Skeleton
function ChampionshipDetailsSkeleton() {
  return (
    <div className="space-y-8 pb-12">
      {/* Back Button Skeleton */}
      <Skeleton className="w-32 h-10 rounded-xl" />
      
      {/* Hero Skeleton */}
      <div className="relative">
        <Skeleton className="h-80 rounded-3xl" />
      </div>

      {/* Tabs Skeleton */}
      <div className="relative">
        <div className="flex gap-2 p-2 bg-surface2/30 rounded-2xl">
          <Skeleton className="h-12 w-40 rounded-xl" />
          <Skeleton className="h-12 w-32 rounded-xl" />
          <Skeleton className="h-12 w-36 rounded-xl" />
          <Skeleton className="h-12 w-32 rounded-xl" />
          <Skeleton className="h-12 w-28 rounded-xl" />
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    </div>
  );
}
