'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useChampionship } from '@/lib/hooks';
import { usePermissions } from '@/lib/hooks';
import { TabsPremium, TabPremium, Button, Skeleton } from '@/components/shared/ui';
import { Calendar, Trophy, Users, BarChart, FileText, AlertTriangle, Eye } from 'lucide-react';
import { ChampionshipHero } from '@/components/championships/ChampionshipHero';
import { teamsAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { EnrollmentModal } from '@/components/championships/EnrollmentModal';
import { PaymentPixModal } from '@/components/championships/PaymentPixModal';
import { EnrollmentActionCard } from '@/components/championships/EnrollmentActionCard';

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
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [paymentModalId, setPaymentModalId] = useState<number | null>(null);
  const user = useAuthStore((state) => state.user);
  
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

  const { data: myTeam } = useQuery({
    queryKey: ['my-team'],
    queryFn: () => teamsAPI.getMyTeam(),
    enabled: user?.user_type === 'TEAM_OWNER',
    staleTime: 30000,
  });

  const pendingEnrollment = enrollments.find(
    (enrollment) => enrollment.team.id === myTeam?.id && enrollment.status === 'PENDING_PAYMENT'
  );

  const myEnrollment = enrollments.find(
    (enrollment) => enrollment.team.id === myTeam?.id
  );

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
    <>
      <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <div className="reveal-fade">
        <ChampionshipHero 
          championship={championship}
          canManage={canManageChampionships}
          onEdit={() => router.push(`/championships?edit=${championship.id}`)}
        />
      </div>

      {user && (
        <div className="reveal-fade-delay-1">
          <EnrollmentActionCard
            championship={championship}
            myTeam={myTeam}
            myEnrollment={myEnrollment || null}
            userType={user.user_type}
            onEnroll={() => setIsEnrollModalOpen(true)}
            onPay={() => setPaymentModalId(myEnrollment?.payment?.id || null)}
          />
        </div>
      )}

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
          <OverviewTab championship={championship} enrollments={enrollments} pendingEnrollment={pendingEnrollment} />
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

      <EnrollmentModal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        championship={championship}
      />

      <PaymentPixModal
        isOpen={!!paymentModalId}
        onClose={() => setPaymentModalId(null)}
        paymentId={paymentModalId}
        championshipId={championship.id}
      />
    </>
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
        <div className="flex gap-2 p-2 bg-surface2/30 rounded-2xl overflow-x-auto">
          <Skeleton className="h-12 w-40 rounded-xl shrink-0" />
          <Skeleton className="h-12 w-32 rounded-xl shrink-0" />
          <Skeleton className="h-12 w-36 rounded-xl shrink-0" />
          <Skeleton className="h-12 w-32 rounded-xl shrink-0" />
          <Skeleton className="h-12 w-28 rounded-xl shrink-0" />
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
