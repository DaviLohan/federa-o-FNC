"""
ea_integration/views.py

ViewSets DRF para a integração EA Pro Clubs.
"""

import logging

from django.db.models import Avg, Sum, Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response

from .ea_client import EAProClubsClient, EAApiError
from .models import EAClub, EAMatch, EAPlayerMatchStats
from .serializers import (
    EAClubSerializer,
    EAClubCreateSerializer,
    EAClubSearchSerializer,
    EAMatchListSerializer,
    EAMatchDetailSerializer,
    EAPlayerMatchStatsSerializer,
    SyncResultSerializer,
)
from .services import MatchSyncService

logger = logging.getLogger(__name__)


class EAClubViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar clubes EA cadastrados.

    list:   GET    /api/v1/ea/clubs/
    create: POST   /api/v1/ea/clubs/
    read:   GET    /api/v1/ea/clubs/{id}/
    update: PUT    /api/v1/ea/clubs/{id}/
    delete: DELETE /api/v1/ea/clubs/{id}/

    Ações customizadas:
    - POST /api/v1/ea/clubs/search/     — Busca clubes na API da EA
    - POST /api/v1/ea/clubs/{id}/sync/  — Sincroniza partidas de 1 clube
    - POST /api/v1/ea/clubs/sync_all/   — Sincroniza partidas de todos os clubes ativos
    """

    queryset = EAClub.objects.select_related('team').all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return EAClubCreateSerializer
        return EAClubSerializer

    def get_permissions(self):
        """Apenas admins podem criar, editar, deletar e sincronizar."""
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'sync', 'sync_all']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['post'], url_path='search')
    def search(self, request):
        """
        Busca clubes na API da EA pelo nome.

        POST /api/v1/ea/clubs/search/
        Body: {"club_name": "Imperium", "platform": "common-gen5"}
        """
        serializer = EAClubSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        client = EAProClubsClient()
        try:
            platform = serializer.validated_data.get('platform', 'common-gen5')
            results = client.search_club(
                club_name=serializer.validated_data['club_name'],
                platform=platform,
            )

            enriched_results = []
            for result in results:
                ea_club_id = str(
                    result.get('ea_club_id')
                    or result.get('clubId')
                    or (result.get('clubInfo') or {}).get('clubId')
                    or ''
                ).strip()
                club_name = (
                    result.get('name')
                    or result.get('clubName')
                    or (result.get('clubInfo') or {}).get('name')
                    or ''
                ).strip()

                existing_link = EAClub.objects.select_related('team').filter(
                    ea_club_id=ea_club_id,
                    platform=platform,
                ).first()
                existing_team_is_active = bool(
                    existing_link and existing_link.team_id and existing_link.team and existing_link.team.is_active
                )

                enriched_results.append({
                    **result,
                    'ea_club_id': ea_club_id,
                    'name': club_name,
                    'platform': platform,
                    'already_linked': existing_team_is_active,
                    'has_legacy_link': bool(existing_link and not existing_team_is_active),
                    'existing_team': (
                        {
                            'id': existing_link.team_id,
                            'name': existing_link.team.name,
                            'is_active': existing_link.team.is_active,
                        }
                        if existing_link and existing_link.team_id
                        else None
                    ),
                })

            return Response({
                'count': len(enriched_results),
                'results': enriched_results,
            })
        except EAApiError as e:
            logger.error('Erro ao buscar clube na EA: %s', e)
            return Response(
                {'error': 'Erro ao consultar a API da EA. Tente novamente.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    @action(detail=True, methods=['post'], url_path='sync')
    def sync(self, request, pk=None):
        """
        Sincroniza partidas de um clube específico.

        POST /api/v1/ea/clubs/{id}/sync/
        Body (opcional): {"match_types": ["leagueMatch", "friendlyMatch"]}
        """
        club = self.get_object()
        match_types = request.data.get('match_types', ['leagueMatch'])

        service = MatchSyncService()
        try:
            result = service.sync_club(club, match_types=match_types)

            # Atualizar last_synced_at
            from django.utils import timezone
            club.last_synced_at = timezone.now()
            club.save(update_fields=['last_synced_at', 'updated_at'])

            return Response(SyncResultSerializer(result).data)

        except EAApiError as e:
            return Response(
                {'error': f'Erro ao sincronizar: {e}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    @action(detail=False, methods=['post'], url_path='sync-all')
    def sync_all(self, request):
        """
        Sincroniza partidas de TODOS os clubes ativos.

        POST /api/v1/ea/clubs/sync-all/
        Body (opcional): {"match_types": ["leagueMatch"]}
        """
        match_types = request.data.get('match_types', ['leagueMatch'])

        service = MatchSyncService()
        result = service.sync_all(match_types=match_types)

        return Response(SyncResultSerializer(result).data)


class EAMatchViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet somente-leitura para partidas EA.

    list:   GET /api/v1/ea/matches/
    read:   GET /api/v1/ea/matches/{id}/

    Filtros via query params:
    - ?club=<ea_club_id>    — Filtra partidas de um clube
    - ?match_type=leagueMatch
    - ?ordering=-played_at  (padrão)

    Ações customizadas:
    - GET /api/v1/ea/matches/{id}/player-stats/  — Stats dos jogadores
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = EAMatch.objects.select_related(
            'home_club', 'away_club',
            'home_club__team', 'away_club__team',
        )

        # Filtro por clube
        club_id = self.request.query_params.get('club')
        if club_id:
            qs = qs.filter(Q(home_club_id=club_id) | Q(away_club_id=club_id))

        # Filtro por tipo de partida
        match_type = self.request.query_params.get('match_type')
        if match_type:
            qs = qs.filter(match_type=match_type)

        return qs

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return EAMatchDetailSerializer
        return EAMatchListSerializer

    @action(detail=True, methods=['get'], url_path='player-stats')
    def player_stats(self, request, pk=None):
        """
        Retorna as stats de todos os jogadores de uma partida.

        GET /api/v1/ea/matches/{id}/player-stats/
        """
        match = self.get_object()
        stats = match.player_stats.select_related('ea_club').order_by('ea_club', '-rating')
        serializer = EAPlayerMatchStatsSerializer(stats, many=True)
        return Response(serializer.data)


class EAPlayerStatsViewSet(viewsets.GenericViewSet):
    """
    ViewSet para consultas agregadas de estatísticas de jogadores EA.

    Ações customizadas:
    - GET /api/v1/ea/player-stats/leaderboard/  — Ranking de jogadores
    - GET /api/v1/ea/player-stats/player/?name=XXX  — Stats de um jogador específico
    """

    permission_classes = [IsAuthenticated]
    serializer_class = EAPlayerMatchStatsSerializer

    @action(detail=False, methods=['get'], url_path='leaderboard')
    def leaderboard(self, request):
        """
        Ranking de jogadores por nota média, gols ou assistências.

        GET /api/v1/ea/player-stats/leaderboard/?club=<id>&order_by=avg_rating&limit=20

        order_by: avg_rating (padrão), total_goals, total_assists, total_matches
        """
        club_id = request.query_params.get('club')
        order_by = request.query_params.get('order_by', 'avg_rating')
        limit = min(int(request.query_params.get('limit', 20)), 100)

        qs = EAPlayerMatchStats.objects.values('player_name')

        if club_id:
            qs = qs.filter(ea_club_id=club_id)

        qs = qs.annotate(
            avg_rating=Avg('rating'),
            total_goals=Sum('goals'),
            total_assists=Sum('assists'),
            total_matches=Count('id'),
            total_saves=Sum('saves'),
            total_passes_made=Sum('passes_made'),
            total_pass_attempts=Sum('pass_attempts'),
        )

        # Ordenação
        order_map = {
            'avg_rating': '-avg_rating',
            'total_goals': '-total_goals',
            'total_assists': '-total_assists',
            'total_matches': '-total_matches',
        }
        qs = qs.order_by(order_map.get(order_by, '-avg_rating'))[:limit]

        return Response(list(qs))

    @action(detail=False, methods=['get'], url_path='player')
    def player(self, request):
        """
        Stats detalhadas de um jogador específico (por gamertag).

        GET /api/v1/ea/player-stats/player/?name=xXDaviXx&club=<id>
        """
        name = request.query_params.get('name')
        if not name:
            return Response(
                {'error': 'Parâmetro "name" é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = EAPlayerMatchStats.objects.filter(player_name__iexact=name)

        club_id = request.query_params.get('club')
        if club_id:
            qs = qs.filter(ea_club_id=club_id)

        qs = qs.select_related('ea_match', 'ea_club').order_by('-ea_match__played_at')

        # Agregados
        aggregates = qs.aggregate(
            avg_rating=Avg('rating'),
            total_goals=Sum('goals'),
            total_assists=Sum('assists'),
            total_matches=Count('id'),
            total_saves=Sum('saves'),
            total_red_cards=Sum('red_cards'),
        )

        # Últimas partidas
        recent = EAPlayerMatchStatsSerializer(qs[:10], many=True).data

        return Response({
            'player_name': name,
            'summary': aggregates,
            'recent_matches': recent,
        })
