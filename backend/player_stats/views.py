from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import PlayerStatistics, TeamStatistics, SeasonSummary, TopScorer
from .serializers import (
    PlayerStatisticsSerializer,
    TeamStatisticsSerializer,
    SeasonSummarySerializer,
    TopScorerSerializer,
)


class PlayerStatisticsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet read-only para estatísticas de jogadores.
    
    As estatísticas são calculadas automaticamente a partir dos matches.
    
    Endpoints:
    - GET /player-statistics/ - Listar estatísticas
    - GET /player-statistics/{id}/ - Detalhes da estatística
    """
    queryset = PlayerStatistics.objects.all()
    serializer_class = PlayerStatisticsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtra estatísticas de jogadores."""
        queryset = PlayerStatistics.objects.all()
        
        # Filtro por jogador
        player_id = self.request.query_params.get('player', None)
        if player_id:
            queryset = queryset.filter(player_id=player_id)
        
        # Filtro por time
        team_id = self.request.query_params.get('team', None)
        if team_id:
            queryset = queryset.filter(team_id=team_id)
        
        # Filtro por campeonato
        championship_id = self.request.query_params.get('championship', None)
        if championship_id:
            queryset = queryset.filter(championship_id=championship_id)
        
        return queryset.select_related('player', 'team', 'championship')


class TeamStatisticsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet read-only para estatísticas de times.
    
    As estatísticas são calculadas automaticamente a partir dos matches.
    
    Endpoints:
    - GET /team-statistics/ - Listar estatísticas
    - GET /team-statistics/{id}/ - Detalhes da estatística
    """
    queryset = TeamStatistics.objects.all()
    serializer_class = TeamStatisticsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtra estatísticas de times."""
        queryset = TeamStatistics.objects.all()
        
        # Filtro por time
        team_id = self.request.query_params.get('team', None)
        if team_id:
            queryset = queryset.filter(team_id=team_id)
        
        # Filtro por campeonato
        championship_id = self.request.query_params.get('championship', None)
        if championship_id:
            queryset = queryset.filter(championship_id=championship_id)
        
        return queryset.select_related('team', 'championship')


class SeasonSummaryViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar resumos de temporada.
    
    Endpoints:
    - GET /season-summaries/ - Listar resumos
    - POST /season-summaries/ - Criar resumo
    - GET /season-summaries/{id}/ - Detalhes do resumo
    - PUT /season-summaries/{id}/ - Atualizar resumo
    - DELETE /season-summaries/{id}/ - Deletar resumo
    """
    queryset = SeasonSummary.objects.all()
    serializer_class = SeasonSummarySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtra resumos de temporada."""
        queryset = SeasonSummary.objects.all()
        
        # Filtro por jogador
        player_id = self.request.query_params.get('player', None)
        if player_id:
            queryset = queryset.filter(player_id=player_id)
        
        # Filtro por temporada
        season_year = self.request.query_params.get('season', None)
        if season_year:
            queryset = queryset.filter(season_year=season_year)
        
        return queryset.select_related('player').order_by('-season_year')


class TopScorerViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet read-only para artilheiros.
    
    Endpoints:
    - GET /top-scorers/ - Listar artilheiros
    - GET /top-scorers/{id}/ - Detalhes do artilheiro
    """
    queryset = TopScorer.objects.all()
    serializer_class = TopScorerSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtra artilheiros."""
        queryset = TopScorer.objects.all()
        
        # Filtro por campeonato
        championship_id = self.request.query_params.get('championship', None)
        if championship_id:
            queryset = queryset.filter(championship_id=championship_id)
        
        # Filtro por posição (medalhas)
        position = self.request.query_params.get('position', None)
        if position:
            queryset = queryset.filter(position=position)
        
        return queryset.select_related('player', 'championship').order_by('position', '-goals')


class LeaderboardAPIView(views.APIView):
    """
    API View para rankings combinados (artilheiros, assistentes, melhores jogadores).
    
    Endpoint:
    - GET /leaderboard/?championship={id}&type={scorers|assisters|players}
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Retorna rankings de acordo com o tipo solicitado.
        
        Query params:
        - championship: ID do campeonato (obrigatório)
        - type: Tipo de ranking (scorers, assisters, players) (default: scorers)
        - limit: Número de resultados (default: 10)
        """
        championship_id = request.query_params.get('championship', None)
        if not championship_id:
            return Response(
                {'error': 'championship é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        leaderboard_type = request.query_params.get('type', 'scorers')
        limit = int(request.query_params.get('limit', 10))
        
        # Buscar estatísticas do campeonato
        stats = PlayerStatistics.objects.filter(
            championship_id=championship_id
        ).select_related('player', 'team')
        
        if leaderboard_type == 'scorers':
            # Artilheiros
            stats = stats.filter(goals__gt=0).order_by('-goals', '-assists')[:limit]
            data = [{
                'player': {
                    'id': stat.player.id,
                    'player_name': stat.player.player_name,
                    'gamer_tag': stat.player.gamer_tag
                },
                'team': {
                    'id': stat.team.id,
                    'name': stat.team.name,
                    'abbreviation': stat.team.abbreviation
                },
                'goals': stat.goals,
                'assists': stat.assists,
                'games_played': stat.games_played
            } for stat in stats]
            
        elif leaderboard_type == 'assisters':
            # Garçons (assistências)
            stats = stats.filter(assists__gt=0).order_by('-assists', '-goals')[:limit]
            data = [{
                'player': {
                    'id': stat.player.id,
                    'player_name': stat.player.player_name,
                    'gamer_tag': stat.player.gamer_tag
                },
                'team': {
                    'id': stat.team.id,
                    'name': stat.team.name,
                    'abbreviation': stat.team.abbreviation
                },
                'assists': stat.assists,
                'goals': stat.goals,
                'games_played': stat.games_played
            } for stat in stats]
            
        elif leaderboard_type == 'players':
            # Melhores jogadores (por média de nota)
            stats = stats.filter(average_rating__isnull=False).order_by('-average_rating')[:limit]
            data = [{
                'player': {
                    'id': stat.player.id,
                    'player_name': stat.player.player_name,
                    'gamer_tag': stat.player.gamer_tag
                },
                'team': {
                    'id': stat.team.id,
                    'name': stat.team.name,
                    'abbreviation': stat.team.abbreviation
                },
                'average_rating': float(stat.average_rating) if stat.average_rating else 0,
                'goals': stat.goals,
                'assists': stat.assists,
                'games_played': stat.games_played
            } for stat in stats]
            
        else:
            return Response(
                {'error': 'Tipo inválido. Use: scorers, assisters ou players.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'championship_id': championship_id,
            'type': leaderboard_type,
            'limit': limit,
            'data': data
        })


class PlayerComparisonAPIView(views.APIView):
    """
    API View para comparar estatísticas de jogadores.
    
    Endpoint:
    - GET /player-comparison/?players={id1,id2,id3}&championship={id}
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Compara estatísticas de múltiplos jogadores em um campeonato.
        
        Query params:
        - players: IDs dos jogadores separados por vírgula (obrigatório)
        - championship: ID do campeonato (opcional)
        """
        players_param = request.query_params.get('players', None)
        if not players_param:
            return Response(
                {'error': 'players é obrigatório (IDs separados por vírgula).'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            player_ids = [int(pid) for pid in players_param.split(',')]
        except ValueError:
            return Response(
                {'error': 'IDs de jogadores inválidos.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        championship_id = request.query_params.get('championship', None)
        
        # Buscar estatísticas
        stats_query = PlayerStatistics.objects.filter(
            player_id__in=player_ids
        ).select_related('player', 'team', 'championship')
        
        if championship_id:
            stats_query = stats_query.filter(championship_id=championship_id)
        
        # Agrupar por jogador
        comparison = {}
        for stat in stats_query:
            player_id = stat.player.id
            if player_id not in comparison:
                comparison[player_id] = {
                    'player': {
                        'id': stat.player.id,
                        'player_name': stat.player.player_name,
                        'gamer_tag': stat.player.gamer_tag
                    },
                    'statistics': []
                }
            
            comparison[player_id]['statistics'].append({
                'championship': {
                    'id': stat.championship.id,
                    'name': stat.championship.name
                },
                'team': {
                    'id': stat.team.id,
                    'name': stat.team.name
                },
                'games_played': stat.games_played,
                'goals': stat.goals,
                'assists': stat.assists,
                'clean_sheets': stat.clean_sheets,
                'yellow_cards': stat.yellow_cards,
                'red_cards': stat.red_cards,
                'average_rating': float(stat.average_rating) if stat.average_rating else None
            })
        
        return Response({
            'players': list(comparison.values())
        })
