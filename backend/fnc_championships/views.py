from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, F, Count, Prefetch
from django.utils import timezone

from .models import Championship, ChampionshipEnrollment, ChampionshipPrize, Bracket, Standings, Group, GroupStandings
from .permissions import IsAdminOrReadOnly, CanManageEnrollment
from .serializers import (
    ChampionshipSerializer,
    ChampionshipDetailSerializer,
    ChampionshipEnrollmentSerializer,
    ChampionshipPrizeSerializer,
    BracketSerializer,
    StandingsSerializer,
    GroupSerializer,
    GroupStandingsSerializer
)
from .services.bracket_generator import BracketGeneratorService
from fnc_payments.serializers import PaymentSerializer
from fnc_payments.services import EnrollmentCheckoutService


class ChampionshipViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar campeonatos.
    
    Endpoints:
    - GET /championships/ - Listar campeonatos
    - POST /championships/ - Criar campeonato
    - GET /championships/{id}/ - Detalhes do campeonato
    - PUT /championships/{id}/ - Atualizar campeonato
    - DELETE /championships/{id}/ - Cancelar campeonato
    - POST /championships/{id}/enroll/ - Inscrever time
    - GET /championships/{id}/enrollments/ - Inscrições
    - GET /championships/{id}/standings/ - Classificação
    - GET /championships/{id}/bracket/ - Chaveamento
    - POST /championships/{id}/start/ - Iniciar campeonato
    """
    queryset = Championship.objects.all()
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_serializer_class(self):
        """Retorna o serializer apropriado para cada ação."""
        if self.action == 'retrieve':
            return ChampionshipDetailSerializer
        return ChampionshipSerializer
    
    def get_queryset(self):
        """Filtra campeonatos e permite busca."""
        Championship.sync_automatic_statuses()
        queryset = Championship.objects.all()
        
        # Filtro por status
        championship_status = self.request.query_params.get('status', None)
        if championship_status:
            statuses = [value.strip() for value in championship_status.split(',') if value.strip()]
            queryset = queryset.filter(status__in=statuses)
        
        # Filtro por formato
        format_type = self.request.query_params.get('format', None)
        if format_type:
            queryset = queryset.filter(format=format_type)
        
        # Filtro por campeonatos abertos para inscrição
        if self.request.query_params.get('open_for_enrollment', None):
            queryset = queryset.filter(
                status='OPEN',
                enrollment_end__gte=timezone.now(),
                enrollment_start__lte=timezone.now(),
            )
        
        # Busca por nome ou descrição
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )
        
        approved_enrollments = ChampionshipEnrollment.objects.filter(
            status='APPROVED'
        ).select_related('team', 'team__owner')

        return queryset.annotate(
            enrolled_teams_count=Count('enrollments', filter=Q(enrollments__status='APPROVED'), distinct=True)
        ).prefetch_related(
            Prefetch('enrollments', queryset=approved_enrollments, to_attr='prefetched_approved_enrollments'),
            'prizes',
            'standings',
            'bracket'
        )

    def perform_create(self, serializer):
        championship = serializer.save(created_by=self.request.user)
        championship.sync_status()

    def perform_update(self, serializer):
        championship = serializer.save()
        championship.sync_status()
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def enroll(self, request, pk=None):
        """
        Inscreve um time no campeonato.
        
        Requer: team_id
        """
        championship = self.get_object()
        
        team_id = request.data.get('team_id')
        if not team_id:
            return Response(
                {'error': 'team_id é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Criar inscrição
        enrollment_data = {
            'championship_id': championship.id,
            'team_id': team_id
        }
        
        serializer = ChampionshipEnrollmentSerializer(data=enrollment_data, context={'request': request})
        if serializer.is_valid():
            payload = EnrollmentCheckoutService.create_checkout(
                user=request.user,
                championship=championship,
                team=serializer.validated_data['team_id'],
            )
            return Response(
                {
                    'message': payload['message'],
                    'requires_payment': payload['requires_payment'],
                    'enrollment': ChampionshipEnrollmentSerializer(payload['enrollment']).data,
                    'payment': PaymentSerializer(payload['payment']).data if payload['payment'] else None,
                },
                status=status.HTTP_201_CREATED,
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def enrollments(self, request, pk=None):
        """
        Retorna todas as inscrições do campeonato.
        """
        championship = self.get_object()
        enrollments = ChampionshipEnrollment.objects.filter(
            championship=championship
        ).select_related('team', 'team__owner')
        
        enrollment_status = request.query_params.get('status', None)
        if enrollment_status:
            enrollments = enrollments.filter(status=enrollment_status)
        
        serializer = ChampionshipEnrollmentSerializer(enrollments, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def standings(self, request, pk=None):
        """
        Retorna a classificação do campeonato (para formato LEAGUE).
        """
        championship = self.get_object()
        
        if championship.championship_type != 'LEAGUE':
            return Response(
                {'error': 'Classificação disponível apenas para campeonatos de pontos corridos.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        standings = Standings.objects.filter(
            championship=championship
        ).select_related('team').annotate(
            goal_difference=F('goals_for') - F('goals_against')
        ).order_by('-points', '-goal_difference', '-goals_for')
        
        serializer = StandingsSerializer(standings, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def bracket(self, request, pk=None):
        """
        Retorna o chaveamento do campeonato (para formato KNOCKOUT).
        """
        championship = self.get_object()
        
        if championship.championship_type != 'KNOCKOUT':
            return Response(
                {'error': 'Chaveamento disponível apenas para campeonatos eliminatórios.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            bracket = Bracket.objects.get(championship=championship)
            serializer = BracketSerializer(bracket)
            return Response(serializer.data)
        except Bracket.DoesNotExist:
            return Response(
                {'error': 'Chaveamento ainda não foi gerado.'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminOrReadOnly])
    def start(self, request, pk=None):
        """
        Inicia o campeonato.
        Gera automaticamente as partidas para campeonatos LEAGUE.
        """
        championship = self.get_object()
        
        if championship.status != 'OPEN':
            return Response(
                {'error': 'Apenas campeonatos abertos podem ser iniciados.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar se há times inscritos suficientes
        enrolled_teams = ChampionshipEnrollment.objects.filter(
            championship=championship,
            status='APPROVED'
        ).count()
        
        if enrolled_teams < championship.min_teams:
            return Response(
                {'error': f'Mínimo de {championship.min_teams} times necessários. (Aprovados: {enrolled_teams})'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Gerar chaveamento/tabela/partidas automaticamente
        from .services import generate_knockout_bracket, generate_league_table
        from .services.league_match_generator import generate_league_matches, can_generate_league_matches
        
        try:
            if championship.championship_type == 'KNOCKOUT':
                # Não deve acontecer - KNOCKOUT está deprecado
                return Response(
                    {'error': 'Tipo KNOCKOUT não é mais suportado. Use GROUPS_KNOCKOUT.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            elif championship.championship_type == 'LEAGUE':
                # ✅ NOVA FUNCIONALIDADE: Gerar partidas round-robin
                can_generate, error_msg = can_generate_league_matches(championship)
                if not can_generate:
                    return Response(
                        {'error': error_msg},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Iniciar campeonato ANTES de gerar partidas
                championship.status = 'IN_PROGRESS'
                championship.save()
                
                # Gerar tabela de classificação
                standings_count = generate_league_table(championship)
                
                # Gerar todas as partidas (round-robin)
                days_between_rounds = request.data.get('days_between_rounds', 7)  # Padrão: 1 semana
                result = generate_league_matches(
                    championship=championship,
                    days_between_rounds=days_between_rounds
                )
                
                summary = result['summary']
                message = (
                    f'Campeonato iniciado com sucesso! '
                    f'Geradas {summary["total_matches"]} partidas em {summary["num_rounds"]} rodadas. '
                    f'Tabela criada com {standings_count} times.'
                )
            
            elif championship.championship_type == 'GROUPS_KNOCKOUT':
                # Iniciar campeonato
                championship.status = 'IN_PROGRESS'
                championship.save()
                
                # Para GROUPS_KNOCKOUT, apenas iniciar - admin gerará grupos e bracket manualmente
                message = 'Campeonato iniciado com sucesso. Configure os grupos e gere o chaveamento.'
            
            else:
                championship.status = 'IN_PROGRESS'
                championship.save()
                message = 'Campeonato iniciado com sucesso.'
        
        except ValueError as e:
            # Se houver erro, reverte o status
            championship.status = 'OPEN'
            championship.save()
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            # Erro inesperado
            championship.status = 'OPEN'
            championship.save()
            return Response(
                {'error': f'Erro ao iniciar campeonato: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'message': message,
            'championship': ChampionshipSerializer(championship).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminOrReadOnly])
    def finish(self, request, pk=None):
        """
        Finaliza o campeonato.
        """
        championship = self.get_object()
        
        if championship.status != 'IN_PROGRESS':
            return Response(
                {'error': 'Apenas campeonatos em andamento podem ser finalizados.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Finalizar campeonato
        championship.status = 'FINISHED'
        championship.end_date = timezone.now()
        championship.save()
        
        return Response({
            'message': 'Campeonato finalizado com sucesso.',
            'championship': ChampionshipSerializer(championship).data
        })
    
    @action(detail=True, methods=['post'])
    def generate_bracket(self, request, pk=None):
        """
        Gera o chaveamento de eliminatórias a partir dos grupos.
        Apenas para campeonatos GROUPS_KNOCKOUT.
        """
        championship = self.get_object()
        
        # Verifica permissão (apenas Admin e Supervisor)
        if not request.user.has_supervisor_access:
            return Response(
                {'error': 'Apenas administradores e supervisores podem gerar chaveamento.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Usa o serviço para gerar o bracket
        service = BracketGeneratorService(championship)
        can_generate, message = service.can_generate()
        
        if not can_generate:
            return Response(
                {'error': message},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            bracket = service.create_bracket()
            return Response({
                'message': 'Chaveamento gerado com sucesso!',
                'bracket': BracketSerializer(bracket).data
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': f'Erro ao gerar chaveamento: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def groups(self, request, pk=None):
        """
        Retorna os grupos do campeonato com suas classificações.
        Apenas para campeonatos GROUPS_KNOCKOUT.
        """
        championship = self.get_object()
        
        if championship.championship_type != 'GROUPS_KNOCKOUT':
            return Response(
                {'error': 'Grupos disponíveis apenas para campeonatos Grupos + Mata-Mata.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        groups = Group.objects.filter(
            championship=championship
        ).prefetch_related('standings__team').order_by('order')
        
        data = []
        for group in groups:
            standings = GroupStandingsSerializer(
                group.standings.all().order_by('-points', '-wins', '-goals_for'),
                many=True
            ).data
            data.append({
                'id': group.id,
                'name': group.name,
                'order': group.order,
                'standings': standings
            })
        
        return Response(data)


class ChampionshipEnrollmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar inscrições de campeonatos.
    
    Endpoints:
    - GET /enrollments/ - Listar inscrições
    - POST /enrollments/ - Criar inscrição
    - GET /enrollments/{id}/ - Detalhes da inscrição
    - PUT /enrollments/{id}/ - Atualizar inscrição
    - DELETE /enrollments/{id}/ - Cancelar inscrição
    - POST /enrollments/{id}/approve/ - Aprovar inscrição
    - POST /enrollments/{id}/reject/ - Rejeitar inscrição
    - POST /enrollments/{id}/confirm_payment/ - Confirmar pagamento
    """
    queryset = ChampionshipEnrollment.objects.all()
    serializer_class = ChampionshipEnrollmentSerializer
    permission_classes = [IsAuthenticated, CanManageEnrollment]
    
    def get_queryset(self):
        """Filtra inscrições."""
        queryset = ChampionshipEnrollment.objects.all()
        
        # Filtro por campeonato
        championship_id = self.request.query_params.get('championship', None)
        if championship_id:
            queryset = queryset.filter(championship_id=championship_id)
        
        # Filtro por time
        team_id = self.request.query_params.get('team', None)
        if team_id:
            queryset = queryset.filter(team_id=team_id)
        
        enrollment_status = self.request.query_params.get('status', None)
        if enrollment_status:
            queryset = queryset.filter(status=enrollment_status)

        payment_status = self.request.query_params.get('payment_status', None)
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)
        
        return queryset.select_related('championship', 'team', 'team__owner')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        try:
            payload = EnrollmentCheckoutService.create_checkout(
                user=request.user,
                championship=serializer.validated_data['championship_id'],
                team=serializer.validated_data['team_id'],
            )
        except ValidationError as e:
            detail = e.detail
            # Se for dict com 'error' e 'gateway_error', repassa direto
            if isinstance(detail, dict):
                return Response(detail, status=status.HTTP_400_BAD_REQUEST)
            # Se for lista ou string
            msg = detail[0] if isinstance(detail, list) else str(detail)
            return Response({'error': str(msg)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                'message': payload['message'],
                'requires_payment': payload['requires_payment'],
                'enrollment': ChampionshipEnrollmentSerializer(payload['enrollment']).data,
                'payment': PaymentSerializer(payload['payment']).data if payload['payment'] else None,
            },
            status=status.HTTP_201_CREATED,
        )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminOrReadOnly])
    def approve(self, request, pk=None):
        """
        Aprova a inscrição.
        """
        enrollment = self.get_object()
        enrollment.status = ChampionshipEnrollment.Status.APPROVED
        enrollment.payment_status = ChampionshipEnrollment.PaymentStatus.PAID
        enrollment.approved_at = timezone.now()
        enrollment.save(update_fields=['status', 'payment_status', 'approved_at'])
        
        return Response({
            'message': 'Inscrição aprovada.',
            'enrollment': ChampionshipEnrollmentSerializer(enrollment).data
        })
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminOrReadOnly])
    def reject(self, request, pk=None):
        """
        Rejeita a inscrição.
        """
        enrollment = self.get_object()
        enrollment.status = ChampionshipEnrollment.Status.REJECTED
        enrollment.save(update_fields=['status'])
        
        return Response({
            'message': 'Inscrição rejeitada.',
            'enrollment': ChampionshipEnrollmentSerializer(enrollment).data
        })
    
    def destroy(self, request, *args, **kwargs):
        enrollment = self.get_object()
        if not request.user.has_supervisor_access and enrollment.team.owner_id != request.user.id:
            return Response({'error': 'Você não pode cancelar esta inscrição.'}, status=status.HTTP_403_FORBIDDEN)

        enrollment.status = ChampionshipEnrollment.Status.CANCELLED
        enrollment.save(update_fields=['status'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class StandingsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet read-only para classificação.
    
    A classificação é calculada automaticamente pelos matches.
    """
    queryset = Standings.objects.all()
    serializer_class = StandingsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtra classificação por campeonato."""
        queryset = Standings.objects.all()
        
        # Filtro por campeonato
        championship_id = self.request.query_params.get('championship', None)
        if championship_id:
            queryset = queryset.filter(championship_id=championship_id)
        
        return queryset.select_related('championship', 'team').order_by(
            '-points',
            '-goal_difference',
            '-goals_for'
        )


class ChampionshipPrizeViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar prêmios de campeonatos.
    """
    queryset = ChampionshipPrize.objects.all()
    serializer_class = ChampionshipPrizeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtra prêmios por campeonato."""
        queryset = ChampionshipPrize.objects.all()
        
        # Filtro por campeonato
        championship_id = self.request.query_params.get('championship', None)
        if championship_id:
            queryset = queryset.filter(championship_id=championship_id)
        
        return queryset.select_related('championship').order_by('position')


class BracketViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet read-only para chaveamentos.
    """
    queryset = Bracket.objects.all()
    serializer_class = BracketSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtra chaveamento por campeonato."""
        queryset = Bracket.objects.all()
        
        # Filtro por campeonato
        championship_id = self.request.query_params.get('championship', None)
        if championship_id:
            queryset = queryset.filter(championship_id=championship_id)
        
        return queryset.select_related('championship')
