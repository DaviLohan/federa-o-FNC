"""
ea_integration/views.py

ViewSets DRF para a integração EA Pro Clubs.
"""

import logging

from django.db.models import Avg, Sum, Count, Q
from django.conf import settings
from rest_framework.exceptions import ValidationError
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .date_utils import custom_bounds, period_bounds
from .ea_client import EAProClubsClient, EAApiError, DEFAULT_SYNC_MATCH_TYPES
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


class EAProxyMatchesRelayView(APIView):
    """Relay protegido para consultas de partidas da EA via servidor antigo."""

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        token = request.headers.get('X-EA-Relay-Token', '')
        if not settings.EA_RELAY_TOKEN or token != settings.EA_RELAY_TOKEN:
            return Response({'error': 'unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        club_id = request.query_params.get('club_id', '').strip()
        platform = request.query_params.get('platform', 'common-gen5').strip()
        match_type = request.query_params.get('match_type', 'leagueMatch').strip()
        max_results = int(request.query_params.get('max_results', '10'))

        if not club_id:
            return Response({'error': 'club_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        client = EAProClubsClient()
        try:
            results = client.get_matches(
                club_id=club_id,
                platform=platform,
                match_type=match_type,
                max_results=max_results,
            )
            return Response({'results': results}, status=status.HTTP_200_OK)
        except EAApiError as exc:
            return Response(
                {
                    'error': str(exc),
                    'status_code': exc.status_code,
                    'details': getattr(exc, 'details', ''),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )


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
        Busca clubes na API da EA pelo nome, com fallback para clubes EA já
        cadastrados localmente (mesmo quando a busca textual da EA não
        retorna o clube esperado).

        POST /api/v1/ea/clubs/search/
        Body: {"club_name": "Pro Eleven", "platform": "common-gen5"}
        """
        serializer = EAClubSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        platform = serializer.validated_data.get('platform', 'common-gen5')
        searched_name = serializer.validated_data['club_name']

        def _enrich(result: dict, source: str) -> dict:
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
                existing_link
                and existing_link.team_id
                and existing_link.team
                and existing_link.team.is_active
            )

            return {
                **result,
                'ea_club_id': ea_club_id,
                'name': club_name,
                'platform': platform,
                'source': source,
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
            }

        enriched_results: list[dict] = []
        seen_keys: set[tuple[str, str]] = set()

        # 1) Fallback local: clubes EA já cadastrados com nome exato
        local_matches = EAClub.objects.select_related('team').filter(
            name__iexact=searched_name,
            platform=platform,
        )
        for ea_club in local_matches:
            entry = _enrich(
                {
                    'ea_club_id': ea_club.ea_club_id,
                    'clubId': ea_club.ea_club_id,
                    'name': ea_club.name,
                    'clubName': ea_club.name,
                },
                source='local_cache',
            )
            key = (entry['ea_club_id'], entry['platform'])
            if entry['ea_club_id'] and key not in seen_keys:
                seen_keys.add(key)
                enriched_results.append(entry)

        # 2) Busca textual oficial na EA
        client = EAProClubsClient()
        try:
            results = client.search_club(
                club_name=searched_name,
                platform=platform,
            )

            for result in results:
                entry = _enrich(result, source='ea_search')
                key = (entry['ea_club_id'], entry['platform'])
                if not entry['ea_club_id'] or key in seen_keys:
                    continue
                seen_keys.add(key)
                enriched_results.append(entry)

            return Response({
                'count': len(enriched_results),
                'results': enriched_results,
            })

        except EAApiError as e:
            logger.error('Erro ao buscar clube na EA: %s', e)

            if enriched_results:
                # EA fora do ar mas temos cache local — devolve com aviso
                return Response({
                    'count': len(enriched_results),
                    'results': enriched_results,
                    'warning': 'Não foi possível consultar a API da EA agora. Resultados do cache local.',
                })

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
        match_types = request.data.get('match_types', list(DEFAULT_SYNC_MATCH_TYPES))

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
        match_types = request.data.get('match_types', list(DEFAULT_SYNC_MATCH_TYPES))

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
    - ?period=yesterday|today|last_48h
    - ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
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

        period = self.request.query_params.get('period')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        try:
            start, end = custom_bounds(date_from, date_to)
            if period:
                start, end = period_bounds(period)
        except ValueError as exc:
            raise ValidationError({'date_range': str(exc)}) from exc

        if start:
            qs = qs.filter(played_at__gte=start)
        if end:
            qs = qs.filter(played_at__lte=end)

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
