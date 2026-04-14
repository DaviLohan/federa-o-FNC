from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import (
    Match, MatchReport, Goal, Card, Contestation,
    MatchProposal, MatchConfirmation,
    MatchLineup, MatchLineupPlayer,
)
from fnc_teams.models import Team, TeamMembership
from users.models import PlayerProfile
from fnc_notifications.models import Notification
from .analytics_services import PlayerStats, TeamStats, MatchStats, ChampionshipStats
from ea_integration.report_service import MatchReportEAService, MatchReportEAError
from ea_integration.serializers import (
    EAReportPreviewSerializer,
    EAReportConfirmSerializer,
    EAReportContestSerializer,
)
from .permissions import (
    IsMatchParticipantOrAdmin,
    CanSubmitMatchReport,
    CanManageMatchReport,
    CanContestMatch,
    CanReviewContestation
)
from .serializers import (
    MatchSerializer,
    MatchDetailSerializer,
    MatchCreateSerializer,
    MatchReportSerializer,
    GoalSerializer,
    GoalWithAssistSerializer,
    CardSerializer,
    ContestationSerializer,
    MatchProposalSerializer,
    MatchProposalResponseSerializer,
    MatchConfirmationSerializer,
    MatchConfirmationUpdateSerializer,
    MatchLineupInputSerializer,
    MatchLineupOutputSerializer,
)


class MatchViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar partidas.
    
    Endpoints:
    - GET /matches/ - Listar partidas
    - POST /matches/ - Criar partida
    - GET /matches/{id}/ - Detalhes da partida
    - PUT /matches/{id}/ - Atualizar partida
    - DELETE /matches/{id}/ - Cancelar partida
    - POST /matches/{id}/start/ - Iniciar partida
    - POST /matches/{id}/finish/ - Finalizar partida
    - GET /matches/{id}/events/ - Eventos da partida
    - POST /matches/{id}/submit_report/ - Submeter sumula
    - POST /matches/{id}/declare_walkover/ - Declarar WO contra time ausente
    - POST /matches/{id}/cancel_match/ - Cancelar partida sem WO
    - GET /matches/pending_walkover/ - Listar partidas pendentes de WO
    """
    queryset = Match.objects.all()
    permission_classes = [IsAuthenticated, IsMatchParticipantOrAdmin]
    
    def get_serializer_class(self):
        """Retorna o serializer apropriado para cada ação."""
        if self.action == 'create':
            return MatchCreateSerializer
        elif self.action == 'retrieve':
            return MatchDetailSerializer
        return MatchSerializer
    
    def get_queryset(self):
        """Filtra partidas."""
        queryset = Match.objects.all()
        
        # Filtro por campeonato
        championship_id = self.request.query_params.get('championship', None)
        if championship_id:
            queryset = queryset.filter(championship_id=championship_id)
        
        # Filtro por time
        team_id = self.request.query_params.get('team', None)
        if team_id:
            queryset = queryset.filter(
                Q(home_team_id=team_id) | Q(away_team_id=team_id)
            )
        
        # Filtro por status
        match_status = self.request.query_params.get('status', None)
        if match_status:
            queryset = queryset.filter(status=match_status)
        
        # Filtro por rodada
        round_number = self.request.query_params.get('round', None)
        if round_number:
            queryset = queryset.filter(round_number=round_number)
        
        return queryset.select_related(
            'championship',
            'home_team',
            'away_team'
        ).prefetch_related('goals', 'cards', 'report')
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsMatchParticipantOrAdmin])
    def start(self, request, pk=None):
        """
        Inicia a partida.
        """
        match = self.get_object()
        
        if match.status != 'SCHEDULED':
            return Response(
                {'error': 'Apenas partidas agendadas podem ser iniciadas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        match.status = 'IN_PROGRESS'
        match.save()
        
        return Response({
            'message': 'Partida iniciada.',
            'match': MatchSerializer(match).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsMatchParticipantOrAdmin])
    def finish(self, request, pk=None):
        """
        Finaliza a partida.
        """
        match = self.get_object()
        
        if match.status != 'IN_PROGRESS':
            return Response(
                {'error': 'Apenas partidas em andamento podem ser finalizadas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar se há súmula
        try:
            report = match.report
            if not report:
                return Response(
                    {'error': 'É necessário submeter a súmula antes de finalizar.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except MatchReport.DoesNotExist:
            return Response(
                {'error': 'É necessário submeter a súmula antes de finalizar.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        match.status = 'FINISHED'
        match.finished_at = timezone.now()
        match.save()
        
        # Atualizar estatísticas automaticamente
        from .services import (
            update_player_statistics,
            update_team_performance,
            update_team_statistics,
            update_standings,
            update_top_scorers
        )
        
        update_player_statistics(match)
        update_team_statistics(match)
        update_team_performance(match)
        update_standings(match)
        update_top_scorers(match)
        
        # Se for campeonato de mata-mata, atualiza o bracket
        if match.championship and match.championship.championship_type == 'KNOCKOUT':
            from fnc_championships.services import update_bracket_after_match
            update_bracket_after_match(match)
        
        return Response({
            'message': 'Partida finalizada e estatísticas atualizadas.',
            'match': MatchDetailSerializer(match).data
        })
    
    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        """
        Retorna todos os eventos da partida (gols, cartões).
        """
        match = self.get_object()
        
        goals = Goal.objects.filter(match=match).select_related('scorer', 'team')
        cards = Card.objects.filter(match=match).select_related('player', 'team')
        
        return Response({
            'goals': GoalWithAssistSerializer(goals, many=True).data,
            'cards': CardSerializer(cards, many=True).data
        })
    
    @action(detail=True, methods=['post'])
    def submit_report(self, request, pk=None):
        """
        Submete a súmula da partida.
        """
        match = self.get_object()
        
        # Verificar se a partida está em andamento ou finalizada
        if match.status not in ['IN_PROGRESS', 'FINISHED']:
            return Response(
                {'error': 'Súmula só pode ser submetida para partidas em andamento ou finalizadas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Criar súmula
        report_data = request.data.copy()
        report_data['match_id'] = match.id
        
        serializer = MatchReportSerializer(data=report_data)
        if serializer.is_valid():
            serializer.save(reported_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsMatchParticipantOrAdmin])
    def declare_walkover(self, request, pk=None):
        """
        Declara Walk-Over (WO) contra um time que não compareceu.
        
        Body esperado:
        {
            "team_id": 123,  # ID do time que não compareceu (home ou away)
            "reason": "Time não compareceu no horário agendado"
        }
        """
        from .match_services.walkover import declare_walkover
        
        match = self.get_object()
        team_id = request.data.get('team_id')
        reason = request.data.get('reason', 'Time não compareceu')
        
        # Validar team_id
        if not team_id:
            return Response(
                {'error': 'Campo team_id é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Identificar o time
        try:
            team_id = int(team_id)
        except (ValueError, TypeError):
            return Response(
                {'error': 'team_id deve ser um número válido.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar se é home ou away
        if team_id == match.home_team.id:
            team = match.home_team
        elif team_id == match.away_team.id:
            team = match.away_team
        else:
            return Response(
                {'error': 'Time especificado não participa desta partida.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Tentar declarar WO
        try:
            result = declare_walkover(match, team, reason)
            
            if not result['success']:
                return Response(
                    {'error': result['message']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response({
                'message': result['message'],
                'match': MatchDetailSerializer(match).data,
                'winner': result['winner'].name,
                'score': result['score']
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erro ao declarar WO: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsMatchParticipantOrAdmin])
    def cancel_match(self, request, pk=None):
        """
        Cancela uma partida sem declarar WO.
        
        Body esperado:
        {
            "reason": "Motivo do cancelamento"
        }
        """
        from .match_services.walkover import WalkOverService
        
        match = self.get_object()
        reason = request.data.get('reason', 'Partida cancelada')
        
        if not reason:
            return Response(
                {'error': 'Campo reason é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Usar o serviço de WO para cancelar
        wo_service = WalkOverService(match)
        
        try:
            result = wo_service.cancel_match(reason)
            
            if not result['success']:
                return Response(
                    {'error': result['message']},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response({
                'message': result['message'],
                'match': MatchSerializer(match).data
            })
            
        except Exception as e:
            return Response(
                {'error': f'Erro ao cancelar partida: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def pending_walkover(self, request):
        """
        Lista partidas pendentes de WO (24h+ atrasadas, sem resultado).
        
        Query params:
        - championship: Filtrar por campeonato específico
        """
        from .match_services.walkover import get_matches_pending_wo
        
        championship_id = request.query_params.get('championship')
        
        if championship_id:
            from fnc_championships.models import Championship
            try:
                championship = Championship.objects.get(id=championship_id)
                matches = get_matches_pending_wo(championship)
            except Championship.DoesNotExist:
                return Response(
                    {'error': 'Campeonato não encontrado.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Listar todas as partidas pendentes de WO
            matches = Match.objects.filter(
                status='SCHEDULED',
                scheduled_date__lt=timezone.now() - timezone.timedelta(hours=24)
            ).exclude(
                is_walkover=True
            ).select_related('home_team', 'away_team', 'championship')
        
        return Response({
            'count': matches.count(),
            'matches': MatchSerializer(matches, many=True).data
        })

    # ── EA Report Actions ─────────────────────────────────────────────────

    @action(
        detail=True,
        methods=['post'],
        url_path='report-ea',
        permission_classes=[IsAuthenticated, IsMatchParticipantOrAdmin],
    )
    def report_ea(self, request, pk=None):
        """
        Busca dados da EA API para esta partida e retorna preview
        para confirmação do usuário.

        POST /api/v1/matches/{id}/report-ea/

        Response:
        {
            "ea_match_id": 123,
            "played_at": "2025-...",
            "home_team": { "team_id": 1, "team_name": "...", "score": 3, "players": [...] },
            "away_team": { ... },
            "warnings": [...],
            "can_confirm": true
        }
        """
        match = self.get_object()
        service = MatchReportEAService()

        try:
            preview = service.fetch_ea_report(match, request.user)
            serializer = EAReportPreviewSerializer(preview)
            return Response(serializer.data)
        except MatchReportEAError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {'error': f'Erro inesperado ao buscar dados EA: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(
        detail=True,
        methods=['post'],
        url_path='confirm-report',
        permission_classes=[IsAuthenticated, IsMatchParticipantOrAdmin],
    )
    def confirm_report(self, request, pk=None):
        """
        Confirma o report EA e salva o resultado da partida.

        POST /api/v1/matches/{id}/confirm-report/
        Body: { "ea_match_id": 123 }

        Cria Goals, Assists, Cards, MatchReport e atualiza estatísticas.
        """
        match = self.get_object()
        serializer = EAReportConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = MatchReportEAService()

        try:
            updated_match = service.confirm_report(
                match=match,
                ea_match_id=serializer.validated_data['ea_match_id'],
                user=request.user,
            )
            return Response({
                'message': 'Resultado confirmado com sucesso!',
                'match': MatchSerializer(updated_match).data,
            })
        except MatchReportEAError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {'error': f'Erro ao confirmar resultado: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(
        detail=True,
        methods=['post'],
        url_path='contest-report',
        permission_classes=[IsAuthenticated, IsMatchParticipantOrAdmin],
    )
    def contest_report(self, request, pk=None):
        """
        Contesta os dados EA e cria uma Contestation.

        POST /api/v1/matches/{id}/contest-report/
        Body: { "ea_match_id": 123, "reason": "WRONG_SCORE", "description": "..." }
        """
        match = self.get_object()
        serializer = EAReportContestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = MatchReportEAService()

        try:
            contestation = service.contest_report(
                match=match,
                ea_match_id=serializer.validated_data['ea_match_id'],
                user=request.user,
                reason=serializer.validated_data['reason'],
                description=serializer.validated_data['description'],
            )
            return Response({
                'message': 'Contestação enviada com sucesso!',
                'contestation': ContestationSerializer(contestation).data,
            })
        except MatchReportEAError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response(
                {'error': f'Erro ao contestar resultado: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MatchReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar súmulas de partidas.
    
    Endpoints:
    - GET /reports/ - Listar súmulas
    - POST /reports/ - Criar súmula
    - GET /reports/{id}/ - Detalhes da súmula
    - PUT /reports/{id}/ - Atualizar súmula
    - POST /reports/{id}/approve/ - Aprovar súmula
    - POST /reports/{id}/reject/ - Rejeitar súmula
    """
    queryset = MatchReport.objects.all()
    serializer_class = MatchReportSerializer
    permission_classes = [IsAuthenticated, CanSubmitMatchReport]
    
    def get_permissions(self):
        """Define permissões por ação."""
        if self.action in ['approve', 'reject']:
            return [CanManageMatchReport()]
        return super().get_permissions()
    
    def get_queryset(self):
        """Filtra súmulas."""
        queryset = MatchReport.objects.all()
        
        # Filtro por partida
        match_id = self.request.query_params.get('match', None)
        if match_id:
            queryset = queryset.filter(match_id=match_id)
        
        # Filtro por usuário que reportou
        reported_by = self.request.query_params.get('reported_by', None)
        if reported_by:
            queryset = queryset.filter(reported_by_id=reported_by)
        
        return queryset.select_related('match', 'reported_by', 'approved_by')
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanManageMatchReport])
    def approve(self, request, pk=None):
        """
        Aprova a súmula.
        """
        report = self.get_object()
        
        report.is_approved = True
        report.approved_by = request.user
        report.approved_at = timezone.now()
        report.save()
        
        return Response({
            'message': 'Súmula aprovada.',
            'report': MatchReportSerializer(report).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanManageMatchReport])
    def reject(self, request, pk=None):
        """
        Rejeita a súmula.
        """
        report = self.get_object()
        
        rejection_reason = request.data.get('rejection_reason', '')
        
        report.is_approved = False
        report.approved_by = request.user
        report.approved_at = timezone.now()
        report.rejection_reason = rejection_reason
        report.save()
        
        return Response({
            'message': 'Súmula rejeitada.',
            'report': MatchReportSerializer(report).data
        })


class GoalViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar gols.
    """
    queryset = Goal.objects.all()
    permission_classes = [IsAuthenticated, IsMatchParticipantOrAdmin]
    
    def get_serializer_class(self):
        """Retorna o serializer com ou sem assistência."""
        if self.action == 'retrieve' or self.action == 'list':
            return GoalWithAssistSerializer
        return GoalSerializer
    
    def get_queryset(self):
        """Filtra gols."""
        queryset = Goal.objects.all()
        
        # Filtro por partida
        match_id = self.request.query_params.get('match', None)
        if match_id:
            queryset = queryset.filter(match_id=match_id)
        
        # Filtro por jogador
        scorer_id = self.request.query_params.get('scorer', None)
        if scorer_id:
            queryset = queryset.filter(scorer_id=scorer_id)
        
        # Filtro por time
        team_id = self.request.query_params.get('team', None)
        if team_id:
            queryset = queryset.filter(team_id=team_id)
        
        return queryset.select_related('match', 'scorer', 'team').prefetch_related('assist')


class CardViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar cartões.
    """
    queryset = Card.objects.all()
    serializer_class = CardSerializer
    permission_classes = [IsAuthenticated, IsMatchParticipantOrAdmin]
    
    def get_queryset(self):
        """Filtra cartões."""
        queryset = Card.objects.all()
        
        # Filtro por partida
        match_id = self.request.query_params.get('match', None)
        if match_id:
            queryset = queryset.filter(match_id=match_id)
        
        # Filtro por jogador
        player_id = self.request.query_params.get('player', None)
        if player_id:
            queryset = queryset.filter(player_id=player_id)
        
        # Filtro por time
        team_id = self.request.query_params.get('team', None)
        if team_id:
            queryset = queryset.filter(team_id=team_id)
        
        # Filtro por tipo
        card_type = self.request.query_params.get('type', None)
        if card_type:
            queryset = queryset.filter(card_type=card_type)
        
        return queryset.select_related('match', 'player', 'team')


class ContestationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar contestações de resultados.
    
    Endpoints:
    - GET /contestations/ - Listar contestações
    - POST /contestations/ - Criar contestação
    - GET /contestations/{id}/ - Detalhes da contestação
    - PUT /contestations/{id}/ - Atualizar contestação
    - POST /contestations/{id}/review/ - Analisar contestação
    - POST /contestations/{id}/accept/ - Aceitar contestação
    - POST /contestations/{id}/reject/ - Rejeitar contestação
    """
    queryset = Contestation.objects.all()
    serializer_class = ContestationSerializer
    permission_classes = [IsAuthenticated, CanContestMatch]
    
    def get_permissions(self):
        """Define permissões por ação."""
        if self.action in ['review', 'accept', 'reject']:
            return [CanReviewContestation()]
        return super().get_permissions()
    
    def get_queryset(self):
        """Filtra contestações."""
        queryset = Contestation.objects.all()
        
        # Filtro por partida
        match_id = self.request.query_params.get('match', None)
        if match_id:
            queryset = queryset.filter(match_id=match_id)
        
        # Filtro por time contestante
        team_id = self.request.query_params.get('team', None)
        if team_id:
            queryset = queryset.filter(team_id=team_id)
        
        # Filtro por status
        contestation_status = self.request.query_params.get('status', None)
        if contestation_status:
            queryset = queryset.filter(status=contestation_status)
        
        return queryset.select_related('match', 'team', 'contested_by', 'reviewed_by')
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanReviewContestation])
    def review(self, request, pk=None):
        """
        Marca a contestação como em análise.
        """
        contestation = self.get_object()
        
        if contestation.status != 'PENDING':
            return Response(
                {'error': 'Apenas contestações pendentes podem ser analisadas.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        contestation.status = 'UNDER_REVIEW'
        contestation.reviewed_by = request.user
        contestation.reviewed_at = timezone.now()
        contestation.save()
        
        return Response({
            'message': 'Contestação em análise.',
            'contestation': ContestationSerializer(contestation).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanReviewContestation])
    def accept(self, request, pk=None):
        """
        Aceita a contestação e reverte o resultado.
        """
        contestation = self.get_object()
        
        if contestation.status not in ['PENDING', 'UNDER_REVIEW']:
            return Response(
                {'error': 'Esta contestação já foi resolvida.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        admin_notes = request.data.get('admin_notes', '')
        
        contestation.status = 'ACCEPTED'
        contestation.reviewed_by = request.user
        contestation.reviewed_at = timezone.now()
        contestation.admin_notes = admin_notes
        contestation.save()
        
        # Atualizar status da partida para CONTESTED
        match = contestation.match
        match.status = 'CONTESTED'
        match.save()
        
        # Reverter resultado da partida
        from .services import reverse_match_result
        reversal_result = reverse_match_result(match, request.user)
        
        if not reversal_result['success']:
            return Response(
                {'error': f"Contestação aceita mas houve erro na reversão: {reversal_result['message']}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'message': 'Contestação aceita. Resultado revertido e partida reagendada.',
            'contestation': ContestationSerializer(contestation).data,
            'reversal_info': reversal_result
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, CanReviewContestation])
    def reject(self, request, pk=None):
        """
        Rejeita a contestação e mantém o resultado.
        """
        contestation = self.get_object()
        
        if contestation.status not in ['PENDING', 'UNDER_REVIEW']:
            return Response(
                {'error': 'Esta contestação já foi resolvida.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        admin_notes = request.data.get('admin_notes', '')
        
        contestation.status = 'REJECTED'
        contestation.reviewed_by = request.user
        contestation.reviewed_at = timezone.now()
        contestation.admin_notes = admin_notes
        contestation.save()
        
        return Response({
            'message': 'Contestação rejeitada. Resultado mantido.',
            'contestation': ContestationSerializer(contestation).data
        })


class MatchProposalViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar propostas de data de partida.
    """
    queryset = MatchProposal.objects.select_related(
        'match',
        'proposed_by_team',
        'responded_by'
    ).all()
    serializer_class = MatchProposalSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['match', 'proposed_by_team', 'status']
    search_fields = ['match__home_team__name', 'match__away_team__name']
    ordering_fields = ['created_at', 'proposed_date', 'expires_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Filtrar propostas por time do usuário ou permitir ver todas se for admin.
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        # Admins veem tudo
        if user.is_staff:
            return queryset
        
        # Usuários veem apenas propostas de seus times
        user_teams = Team.objects.filter(
            teammembership__player__user=user,
            teammembership__is_active=True
        )
        
        return queryset.filter(
            models.Q(match__home_team__in=user_teams) |
            models.Q(match__away_team__in=user_teams)
        )
    
    def perform_create(self, serializer):
        """Ao criar, verificar se usuário é membro do time."""
        proposed_by_team = serializer.validated_data['proposed_by_team']
        user = self.request.user
        
        # Verificar se usuário é membro do time
        is_member = TeamMembership.objects.filter(
            team=proposed_by_team,
            player__user=user,
            is_active=True
        ).exists()
        
        if not is_member and not user.is_staff:
            raise PermissionDenied('Você não é membro deste time.')
        
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """
        Responder a uma proposta (aceitar ou rejeitar).
        """
        proposal = self.get_object()
        match = proposal.match
        user = request.user
        
        # Verificar se proposta ainda está pendente
        if proposal.status != MatchProposal.Status.PENDING:
            return Response(
                {'error': 'Esta proposta já foi respondida.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar se proposta expirou
        if proposal.is_expired():
            proposal.status = MatchProposal.Status.EXPIRED
            proposal.save()
            return Response(
                {'error': 'Esta proposta expirou.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar se usuário é do time adversário
        opponent_team = match.away_team if proposal.proposed_by_team == match.home_team else match.home_team
        is_opponent_member = TeamMembership.objects.filter(
            team=opponent_team,
            player__user=user,
            is_active=True
        ).exists()
        
        if not is_opponent_member and not user.is_staff:
            raise PermissionDenied('Apenas membros do time adversário podem responder.')
        
        # Validar ação
        response_serializer = MatchProposalResponseSerializer(data=request.data)
        response_serializer.is_valid(raise_exception=True)
        
        action = response_serializer.validated_data['action']
        response_message = response_serializer.validated_data.get('response_message', '')
        
        if action == 'accept':
            # Aceitar proposta e atualizar data da partida
            proposal.status = MatchProposal.Status.ACCEPTED
            proposal.responded_by = user
            proposal.responded_at = timezone.now()
            proposal.response_message = response_message
            proposal.save()
            
            # Atualizar data da partida
            match.scheduled_date = proposal.proposed_date
            match.save()
            
            # Rejeitar outras propostas pendentes para esta partida
            MatchProposal.objects.filter(
                match=match,
                status=MatchProposal.Status.PENDING
            ).exclude(id=proposal.id).update(
                status=MatchProposal.Status.REJECTED,
                response_message='Outra proposta foi aceita'
            )
            
            return Response({
                'message': 'Proposta aceita! Data da partida atualizada.',
                'proposal': MatchProposalSerializer(proposal).data,
                'new_match_date': match.scheduled_date
            })
        
        else:  # reject
            proposal.status = MatchProposal.Status.REJECTED
            proposal.responded_by = user
            proposal.responded_at = timezone.now()
            proposal.response_message = response_message
            proposal.save()
            
            return Response({
                'message': 'Proposta rejeitada.',
                'proposal': MatchProposalSerializer(proposal).data
            })


class MatchConfirmationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar confirmações de presença em partidas.
    """
    queryset = MatchConfirmation.objects.select_related(
        'match',
        'team',
        'confirmed_by'
    ).all()
    serializer_class = MatchConfirmationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['match', 'team', 'status']
    search_fields = ['team__name', 'match__home_team__name', 'match__away_team__name']
    ordering_fields = ['created_at', 'confirmation_deadline']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        Filtrar confirmações por time do usuário ou permitir ver todas se for admin.
        """
        queryset = super().get_queryset()
        user = self.request.user
        
        # Admins veem tudo
        if user.is_staff:
            return queryset
        
        # Usuários veem apenas confirmações de seus times
        user_teams = Team.objects.filter(
            teammembership__player__user=user,
            teammembership__is_active=True
        )
        
        return queryset.filter(team__in=user_teams)
    
    def perform_create(self, serializer):
        """Ao criar, verificar se usuário é membro do time."""
        team = serializer.validated_data['team']
        user = self.request.user
        
        # Verificar se usuário é membro do time
        is_member = TeamMembership.objects.filter(
            team=team,
            player__user=user,
            is_active=True
        ).exists()
        
        if not is_member and not user.is_staff:
            raise PermissionDenied('Você não é membro deste time.')
        
        # Definir deadline padrão (24h antes da partida)
        if 'confirmation_deadline' not in serializer.validated_data:
            match = serializer.validated_data['match']
            from datetime import timedelta
            serializer.validated_data['confirmation_deadline'] = match.scheduled_date - timedelta(hours=24)
        
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """
        Confirmar presença na partida.
        """
        confirmation = self.get_object()
        user = request.user
        
        # Verificar se já foi confirmado
        if confirmation.status != MatchConfirmation.Status.PENDING:
            return Response(
                {'error': 'Esta confirmação já foi processada.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar se usuário é membro do time
        is_member = TeamMembership.objects.filter(
            team=confirmation.team,
            player__user=user,
            is_active=True
        ).exists()
        
        if not is_member and not user.is_staff:
            raise PermissionDenied('Você não é membro deste time.')
        
        # Confirmar presença
        confirmation.status = MatchConfirmation.Status.CONFIRMED
        confirmation.confirmed_by = user
        confirmation.confirmed_at = timezone.now()
        confirmation.save()
        
        return Response({
            'message': 'Presença confirmada!',
            'confirmation': MatchConfirmationSerializer(confirmation).data
        })
    
    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """
        Recusar participação na partida.
        """
        confirmation = self.get_object()
        user = request.user
        
        # Verificar se já foi processado
        if confirmation.status != MatchConfirmation.Status.PENDING:
            return Response(
                {'error': 'Esta confirmação já foi processada.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar se usuário é membro do time
        is_member = TeamMembership.objects.filter(
            team=confirmation.team,
            player__user=user,
            is_active=True
        ).exists()
        
        if not is_member and not user.is_staff:
            raise PermissionDenied('Você não é membro deste time.')
        
        # Validar dados
        update_serializer = MatchConfirmationUpdateSerializer(data=request.data)
        update_serializer.is_valid(raise_exception=True)
        
        decline_reason = update_serializer.validated_data['decline_reason']
        
        # Recusar presença
        confirmation.status = MatchConfirmation.Status.DECLINED
        confirmation.confirmed_by = user
        confirmation.confirmed_at = timezone.now()
        confirmation.decline_reason = decline_reason
        confirmation.save()
        
        return Response({
            'message': 'Participação recusada.',
            'confirmation': MatchConfirmationSerializer(confirmation).data
        })


# ====================================
# STATISTICS VIEWSET
# ====================================

class StatisticsViewSet(viewsets.ViewSet):
    """
    ViewSet para expor estatísticas e analytics avançados.
    
    Endpoints:
    - GET /statistics/player_stats/?player_id=X&championship_id=Y
    - GET /statistics/top_scorers/?championship_id=X&limit=10
    - GET /statistics/top_assisters/?championship_id=X&limit=10
    - GET /statistics/most_disciplined/?championship_id=X&limit=10
    - GET /statistics/team_stats/?team_id=X&championship_id=Y
    - GET /statistics/rankings/?championship_id=X
    - GET /statistics/match_details/?match_id=X
    - GET /statistics/championship_overview/?championship_id=X
    """
    permission_classes = [AllowAny]  # Estatísticas públicas
    
    @action(detail=False, methods=['get'])
    def player_stats(self, request):
        """
        Retorna estatísticas completas de um jogador.
        
        Query params:
        - player_id (required): ID do jogador
        - championship_id (optional): Filtrar por campeonato específico
        """
        player_id = request.query_params.get('player_id')
        if not player_id:
            return Response(
                {'error': 'player_id é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        championship_id = request.query_params.get('championship_id')
        
        stats = PlayerStats.get_player_overall_stats(
            player_id=player_id,
            championship_id=championship_id
        )
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def top_scorers(self, request):
        """
        Retorna ranking dos maiores artilheiros.
        
        Query params:
        - championship_id (optional): Filtrar por campeonato
        - limit (optional): Número de resultados (default: 10)
        """
        championship_id = request.query_params.get('championship_id')
        limit = int(request.query_params.get('limit', 10))
        
        stats = PlayerStats.get_top_scorers(
            championship_id=championship_id,
            limit=limit
        )
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def top_assisters(self, request):
        """
        Retorna ranking dos maiores assistentes.
        
        Query params:
        - championship_id (optional): Filtrar por campeonato
        - limit (optional): Número de resultados (default: 10)
        """
        championship_id = request.query_params.get('championship_id')
        limit = int(request.query_params.get('limit', 10))
        
        stats = PlayerStats.get_top_assisters(
            championship_id=championship_id,
            limit=limit
        )
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def most_disciplined(self, request):
        """
        Retorna jogadores mais disciplinados (menos cartões).
        
        Query params:
        - championship_id (optional): Filtrar por campeonato
        - limit (optional): Número de resultados (default: 10)
        """
        championship_id = request.query_params.get('championship_id')
        limit = int(request.query_params.get('limit', 10))
        
        stats = PlayerStats.get_most_disciplined(
            championship_id=championship_id,
            limit=limit
        )
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def team_stats(self, request):
        """
        Retorna estatísticas completas de uma equipe.
        
        Query params:
        - team_id (required): ID da equipe
        - championship_id (optional): Filtrar por campeonato específico
        """
        team_id = request.query_params.get('team_id')
        if not team_id:
            return Response(
                {'error': 'team_id é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        championship_id = request.query_params.get('championship_id')
        
        stats = TeamStats.get_team_overall_stats(
            team_id=team_id,
            championship_id=championship_id
        )
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def rankings(self, request):
        """
        Retorna classificação completa de um campeonato.
        
        Query params:
        - championship_id (required): ID do campeonato
        """
        championship_id = request.query_params.get('championship_id')
        if not championship_id:
            return Response(
                {'error': 'championship_id é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        stats = TeamStats.get_team_rankings(championship_id=championship_id)
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def match_details(self, request):
        """
        Retorna estatísticas detalhadas de uma partida.
        
        Query params:
        - match_id (required): ID da partida
        """
        match_id = request.query_params.get('match_id')
        if not match_id:
            return Response(
                {'error': 'match_id é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        stats = MatchStats.get_match_detailed_stats(match_id=match_id)
        
        return Response(stats)
    
    @action(detail=False, methods=['get'])
    def championship_overview(self, request):
        """
        Retorna visão geral completa de um campeonato.
        
        Query params:
        - championship_id (required): ID do campeonato
        """
        championship_id = request.query_params.get('championship_id')
        if not championship_id:
            return Response(
                {'error': 'championship_id é obrigatório'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        stats = ChampionshipStats.get_championship_overview(
            championship_id=championship_id
        )
        
        return Response(stats)


# ---------------------------------------------------------------------------
# MatchLineupView — Escalação tática por partida
# ---------------------------------------------------------------------------

class MatchLineupView(APIView):
    """
    Endpoint para criar/consultar a escalação de um time em uma partida.

    POST /api/v1/matches/<match_id>/lineup/
        Payload:
        {
            "formation": "4-3-3",
            "players": [
                {"player_id": 1, "position": "GK", "x_position": 50.0, "y_position": 8.0},
                ...  (11 jogadores no total)
            ]
        }

        - Somente OWNER ou CAPTAIN do time participante podem submeter.
        - Ao salvar, dispara notificação MATCH_CALLUP para cada convocado.
        - Suporta re-submissão: sobrescreve a escalação existente do time.

    GET /api/v1/matches/<match_id>/lineup/
        Retorna a escalação do time do usuário autenticado naquela partida,
        ou 404 se ainda não houver.
    """

    permission_classes = [IsAuthenticated]

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_match_and_membership(self, request, match_id):
        """
        Retorna (match, membership) ou levanta PermissionDenied/404.

        O usuário deve ser OWNER ou CAPTAIN de um dos times da partida.
        """
        match = get_object_or_404(Match, pk=match_id)

        membership = TeamMembership.objects.filter(
            player__user=request.user,
            team__in=[match.home_team, match.away_team],
            role__in=[TeamMembership.Role.OWNER, TeamMembership.Role.CAPTAIN],
            is_active=True,
        ).select_related('team').first()

        if not membership:
            raise PermissionDenied(
                'Apenas o dono ou capitão de um dos times participantes pode '
                'gerenciar a escalação.'
            )

        return match, membership

    def _send_callup_notifications(self, match, lineup, player_profiles):
        """
        Cria uma notificação MATCH_CALLUP para cada jogador convocado.
        Ignora erros individuais para não interromper a criação da escalação.
        """
        # Descobre o adversário a partir do time que está escalando
        adversario = (
            match.away_team
            if lineup.team == match.home_team
            else match.home_team
        )

        notifications = []
        for profile in player_profiles:
            # Só notifica se o perfil tem user associado
            if not hasattr(profile, 'user') or profile.user is None:
                continue
            notifications.append(Notification(
                user=profile.user,
                notification_type='MATCH_CALLUP',
                title='Você foi Convocado!',
                message=(
                    f'O manager te escalou para o jogo contra '
                    f'{adversario.name} na formação {lineup.formation}.'
                ),
                action_url=f'/matches/{match.pk}',
                related_match_id=match.pk,
            ))

        if notifications:
            Notification.objects.bulk_create(notifications, ignore_conflicts=True)

    # ------------------------------------------------------------------
    # POST — criar / sobrescrever escalação
    # ------------------------------------------------------------------

    def post(self, request, match_id):
        match, membership = self._get_match_and_membership(request, match_id)
        team = membership.team

        # --- Validar payload ---
        serializer = MatchLineupInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        formation    = serializer.validated_data['formation']
        players_data = serializer.validated_data['players']

        # --- Validar que todos os player_id pertencem ao elenco ativo ---
        player_ids = [p['player_id'] for p in players_data]
        active_player_ids = set(
            TeamMembership.objects.filter(
                team=team,
                player__id__in=player_ids,
                is_active=True,
            ).values_list('player_id', flat=True)
        )
        invalid_ids = set(player_ids) - active_player_ids
        if invalid_ids:
            return Response(
                {
                    'error': 'Alguns jogadores não pertencem ao elenco ativo do time.',
                    'invalid_player_ids': sorted(invalid_ids),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Buscar PlayerProfile objects ---
        profiles_by_id = {
            p.pk: p
            for p in PlayerProfile.objects.filter(
                pk__in=player_ids
            ).select_related('user')
        }

        # --- Criar ou atualizar a MatchLineup ---
        lineup, _ = MatchLineup.objects.update_or_create(
            match=match,
            team=team,
            defaults={
                'formation': formation,
                'submitted_by': request.user,
            },
        )

        # Remove jogadores anteriores e recria (replace total)
        lineup.players.all().delete()
        MatchLineupPlayer.objects.bulk_create([
            MatchLineupPlayer(
                lineup=lineup,
                player=profiles_by_id[p['player_id']],
                position=p['position'],
                x_position=p['x_position'],
                y_position=p['y_position'],
            )
            for p in players_data
        ])

        # --- Disparar notificações de convocação ---
        self._send_callup_notifications(
            match=match,
            lineup=lineup,
            player_profiles=list(profiles_by_id.values()),
        )

        # --- Retornar escalação salva ---
        lineup.refresh_from_db()
        output = MatchLineupOutputSerializer(lineup)
        return Response(output.data, status=status.HTTP_201_CREATED)

    # ------------------------------------------------------------------
    # GET — consultar escalação existente do time do usuário
    # ------------------------------------------------------------------

    def get(self, request, match_id):
        match = get_object_or_404(Match, pk=match_id)

        # Descobre o time do usuário nessa partida (qualquer role)
        membership = TeamMembership.objects.filter(
            player__user=request.user,
            team__in=[match.home_team, match.away_team],
            is_active=True,
        ).first()

        if not membership:
            raise PermissionDenied(
                'Você não é membro de nenhum dos times desta partida.'
            )

        # Se ?team=opponent, retorna escalação do adversário
        if request.query_params.get('team') == 'opponent':
            opponent_team = (
                match.away_team if membership.team == match.home_team else match.home_team
            )
            lineup = MatchLineup.objects.filter(
                match=match,
                team=opponent_team,
            ).prefetch_related('players__player__user').first()
        else:
            lineup = MatchLineup.objects.filter(
                match=match,
                team=membership.team,
            ).prefetch_related('players__player__user').first()

        if not lineup:
            return Response(
                {'detail': 'Nenhuma escalação encontrada para este time nesta partida.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        output = MatchLineupOutputSerializer(lineup)
        return Response(output.data, status=status.HTTP_200_OK)
