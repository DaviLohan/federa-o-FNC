from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.db.models import Q, Count, Exists, OuterRef, Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Team, TeamMembership, TeamInvitation, TeamLeaveRequest, Formation, FormationPosition
from player_stats.models import PlayerProfile
from .permissions import (
    IsTeamOwnerOrReadOnly,
    IsTeamMemberOrOwner,
    IsInvitedPlayerOrTeamOwner,
    CanManageFormation
)
from .serializers import (
    TeamSerializer,
    TeamListSerializer,
    TeamDetailSerializer,
    DEFAULT_LINEUP_STYLE,
    TeamLineupStyleSerializer,
    TeamLineupStyleResponseSerializer,
    TeamMembershipSerializer,
    TeamInvitationSerializer,
    TeamLeaveRequestSerializer,
    FormationSerializer,
    FormationCreateSerializer
)
from .performance_service import TeamPerformanceService
from .purge_service import TeamPurgeService
from users.permissions import IsAdminOrSupervisor


def user_can_manage_team_operations(user, team: Team) -> bool:
    if team.owner_id == user.id:
        return True
    return TeamMembership.objects.filter(
        team=team,
        player__user=user,
        role__in=[TeamMembership.Role.CAPTAIN, TeamMembership.Role.COMMISSION],
        is_active=True,
    ).exists()


def user_can_manage_team_roster(user, team: Team) -> bool:
    if team.owner_id == user.id:
        return True

    return TeamMembership.objects.filter(
        team=team,
        player__user=user,
        role=TeamMembership.Role.CAPTAIN,
        is_active=True,
    ).exists()


class TeamViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar times.
    
    Endpoints:
    - GET /teams/ - Listar times
    - POST /teams/ - Criar time
    - GET /teams/{id}/ - Detalhes do time
    - PUT /teams/{id}/ - Atualizar time
    - DELETE /teams/{id}/ - Desativar time
    - GET /teams/{id}/members/ - Membros do time
    - GET /teams/{id}/formations/ - Formações do time
    - POST /teams/{id}/invite_player/ - Convidar jogador
    """
    queryset = Team.objects.all()
    permission_classes = [IsAuthenticated, IsTeamOwnerOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get_optimized_queryset(self, queryset=None):
        if queryset is None:
            queryset = Team.objects.all()

        from fnc_championships.models import ChampionshipEnrollment

        active_championships = ChampionshipEnrollment.objects.filter(
            team_id=OuterRef('pk'),
            championship__status__in=['OPEN', 'IN_PROGRESS'],
            status='APPROVED'
        )

        memberships_queryset = TeamMembership.objects.filter(
            is_active=True
        ).select_related('player', 'player__user')

        formations_queryset = Formation.objects.prefetch_related(
            Prefetch(
                'positions',
                queryset=FormationPosition.objects.select_related('player', 'player__user')
            )
        )

        return queryset.select_related('owner', 'ea_club').annotate(
            player_count=Count('teammembership', filter=Q(teammembership__is_active=True), distinct=True),
            has_active_championship=Exists(active_championships)
        ).prefetch_related(
            Prefetch('teammembership_set', queryset=memberships_queryset, to_attr='prefetched_active_memberships'),
            Prefetch('formations', queryset=formations_queryset)
        )
    
    def get_serializer_class(self):
        """Retorna o serializer apropriado para cada ação."""
        if self.action == 'lineup_style':
            if self.request.method in ['PATCH', 'PUT']:
                return TeamLineupStyleSerializer
            return TeamLineupStyleResponseSerializer
        if self.action == 'list':
            return TeamListSerializer
        elif self.action == 'retrieve':
            return TeamDetailSerializer
        return TeamSerializer
    
    def get_queryset(self):
        """Lista times ativos; admin/supervisor veem todos, demais só os vinculados."""
        queryset = Team.objects.filter(is_active=True)
        user = self.request.user

        # Filtro por dono específico (se passado como query param)
        owner_id = self.request.query_params.get('owner', None)
        if owner_id:
            queryset = queryset.filter(owner_id=owner_id)
        elif not user.has_supervisor_access:
            # Se não especificou owner, mostrar apenas times do usuário logado
            # (times onde ele é dono OU membro ativo)
            queryset = queryset.filter(
                Q(owner=user) | 
                Q(teammembership__player__user=user, teammembership__is_active=True)
            ).distinct()
        
        # Busca por nome ou sigla
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(abbreviation__icontains=search)
            )
        
        return self._get_optimized_queryset(queryset).distinct()

    def _get_lineup_style(self, team: Team):
        prefs = team.lineup_visual_preferences or {}
        return {
            **DEFAULT_LINEUP_STYLE,
            **{key: value for key, value in prefs.items() if value not in [None, '']},
        }

    def _can_manage_lineup_style(self, user, team: Team):
        if team.owner_id == user.id:
            return True
        return TeamMembership.objects.filter(
            team=team,
            player__user=user,
            role__in=[TeamMembership.Role.OWNER, TeamMembership.Role.CAPTAIN, TeamMembership.Role.COMMISSION],
            is_active=True,
        ).exists()

    def _can_manage_team_operations(self, user, team: Team) -> bool:
        return user_can_manage_team_operations(user, team)
    
    def perform_create(self, serializer):
        """
        Define o dono do time como o usuário atual.
        Se o usuário for PLAYER, promove automaticamente para TEAM_OWNER (Manager).
        Impede que um usuário crie mais de um time ativo.
        """
        user = self.request.user

        # Bloquear criação de segundo time
        if Team.objects.filter(owner=user, is_active=True).exists():
            raise ValidationError(
                'Você já possui um time ativo. Delete-o antes de criar outro.'
            )

        # Bloquear se for membro ativo de algum time
        if TeamMembership.objects.filter(player__user=user, is_active=True).exists():
            raise ValidationError(
                'Você já faz parte de um time como jogador. Saia dele antes de criar um novo.'
            )

        # Auto-promover jogador para Manager ao criar time
        if user.user_type == 'PLAYER':
            user.user_type = 'TEAM_OWNER'
            user.save(update_fields=['user_type'])

        try:
            with transaction.atomic():
                team = serializer.save(owner=user)

                # Adicionar o owner ao elenco como membro com role OWNER
                try:
                    player_profile = PlayerProfile.objects.get(user=user)
                    TeamMembership.objects.create(
                        team=team,
                        player=player_profile,
                        role=TeamMembership.Role.OWNER,
                        is_active=True,
                    )
                except PlayerProfile.DoesNotExist:
                    pass
        except IntegrityError:
            raise ValidationError(
                'Este clube oficial da EA já está vinculado a outro time. Revise a validação e tente novamente.'
            )
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        """
        Retorna todos os membros do time.
        """
        team = self.get_object()
        memberships = TeamMembership.objects.filter(
            team=team,
            is_active=True
        ).select_related('player', 'player__user')
        
        serializer = TeamMembershipSerializer(memberships, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def formations(self, request, pk=None):
        """
        Retorna todas as formações do time.
        """
        team = self.get_object()
        formations = Formation.objects.filter(team=team).prefetch_related('positions')
        
        serializer = FormationSerializer(formations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def performance(self, request, pk=None):
        """Retorna analytics de desempenho do time para a nova aba."""
        team = self.get_object()
        payload = TeamPerformanceService.get_team_performance(
            team,
            championship_id=request.query_params.get('championship_id'),
            context=request.query_params.get('context'),
            date_from=request.query_params.get('date_from'),
            date_to=request.query_params.get('date_to'),
        )
        return Response(payload)

    @action(detail=True, methods=['get', 'patch'], url_path='lineup-style')
    def lineup_style(self, request, pk=None):
        team = self.get_object()

        if request.method == 'GET':
            return Response(self._get_lineup_style(team))

        if not self._can_manage_lineup_style(request.user, team):
            return Response(
                {'error': 'Apenas o dono ou capitão pode editar o estilo da escalação.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        merged = {
            **self._get_lineup_style(team),
            **serializer.validated_data,
        }
        team.lineup_visual_preferences = merged
        team.save(update_fields=['lineup_visual_preferences', 'updated_at'])
        return Response(self._get_lineup_style(team))
    
    @action(detail=False, methods=['get'], url_path='my-team')
    def my_team(self, request):
        """
        Retorna o time do usuário logado (como dono ou membro).
        """
        user = request.user
        
        # Buscar time onde é dono
        team_as_owner = self._get_optimized_queryset(
            Team.objects.filter(owner=user, is_active=True)
        ).first()
        if team_as_owner:
            serializer = TeamDetailSerializer(team_as_owner)
            return Response(serializer.data)
        
        # Buscar time onde é membro ativo
        try:
            membership = TeamMembership.objects.filter(
                player__user=user,
                is_active=True
            ).select_related('team').first()
            
            if membership:
                team = self._get_optimized_queryset(
                    Team.objects.filter(pk=membership.team_id, is_active=True)
                ).first()
                serializer = TeamDetailSerializer(team or membership.team)
                return Response(serializer.data)
        except:
            pass
        
        # Não tem time
        return Response(
            {'detail': 'Você ainda não faz parte de nenhum time.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=True, methods=['post'])
    def invite_player(self, request, pk=None):
        """
        Convida um jogador para o time.
        
        Requer: player_id
        """
        team = get_object_or_404(Team, pk=pk, is_active=True)
        
        if not user_can_manage_team_roster(request.user, team):
            return Response(
                {'error': 'Apenas o dono ou capitão do time pode convidar jogadores.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        player_id = request.data.get('player_id')
        if not player_id:
            return Response(
                {'error': 'player_id é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Criar convite
        invitation_data = {
            'team_id': team.id,
            'player_id': player_id,
            'message': request.data.get('message', ''),
        }
        
        serializer = TeamInvitationSerializer(data=invitation_data)
        if serializer.is_valid():
            serializer.save(invited_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def set_member_role(self, request, pk=None):
        """Promove/rebaixa membro (owner-only), incluindo Comissão Técnica."""
        team = get_object_or_404(Team, pk=pk, is_active=True)

        if not user_can_manage_team_roster(request.user, team):
            return Response(
                {'error': 'Apenas o dono ou capitão do time pode alterar papéis de membros.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        membership_id = request.data.get('membership_id')
        role = request.data.get('role')
        if not membership_id or not role:
            return Response(
                {'error': 'membership_id e role são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        allowed_roles = {
            TeamMembership.Role.CAPTAIN,
            TeamMembership.Role.COMMISSION,
            TeamMembership.Role.PLAYER,
        }
        if role not in allowed_roles:
            return Response(
                {'error': 'Role inválido. Use CAPTAIN, COMMISSION ou PLAYER.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership = TeamMembership.objects.filter(
            pk=membership_id,
            team=team,
            is_active=True,
        ).select_related('player', 'player__user').first()
        if not membership:
            return Response({'error': 'Membro não encontrado neste time.'}, status=status.HTTP_404_NOT_FOUND)

        if membership.role == TeamMembership.Role.OWNER:
            return Response({'error': 'Não é permitido alterar o papel do dono do time.'}, status=status.HTTP_400_BAD_REQUEST)

        membership.role = role
        try:
            membership.save(update_fields=['role'])
        except DjangoValidationError as exc:
            if hasattr(exc, 'message_dict') and exc.message_dict:
                first_messages = []
                for value in exc.message_dict.values():
                    if isinstance(value, (list, tuple)):
                        first_messages.extend(str(item) for item in value if item)
                    elif value:
                        first_messages.append(str(value))
                message = first_messages[0] if first_messages else str(exc)
            elif hasattr(exc, 'messages') and exc.messages:
                message = exc.messages[0]
            else:
                message = str(exc)
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                'message': 'Papel atualizado com sucesso.',
                'membership': TeamMembershipSerializer(membership).data,
            },
            status=status.HTTP_200_OK,
        )
    
    def destroy(self, request, *args, **kwargs):
        """
        Desativa o time (soft-delete) ao invés de deletar.
        Também desativa memberships, cancela convites e leave requests pendentes.
        """
        instance = self.get_object()

        # Verificar se o usuário é o dono do time
        if instance.owner != request.user:
            return Response(
                {'error': 'Apenas o dono do time pode excluí-lo.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Soft-delete com cascata
        instance.is_active = False
        instance.save(update_fields=['is_active'])

        # Liberar o vínculo oficial da EA para permitir novo cadastro futuro.
        if hasattr(instance, 'ea_club') and instance.ea_club:
            instance.ea_club.team = None
            instance.ea_club.is_active = False
            instance.ea_club.save(update_fields=['team', 'is_active', 'updated_at'])

        # Reverter owner para PLAYER — sem time ativo ele deixa de ser TEAM_OWNER
        owner = instance.owner
        owner.user_type = 'PLAYER'
        owner.save(update_fields=['user_type'])

        # Desativar todos os membros
        TeamMembership.objects.filter(team=instance, is_active=True).update(
            is_active=False,
            left_at=timezone.now()
        )

        # Cancelar convites pendentes
        TeamInvitation.objects.filter(
            team=instance,
            status='PENDING'
        ).update(status='CANCELLED')

        # Cancelar leave requests pendentes
        TeamLeaveRequest.objects.filter(
            team=instance,
            status='PENDING'
        ).update(status='REJECTED', resolved_at=timezone.now(), resolved_by=request.user)

        return Response(
            {'message': 'Time excluído com sucesso.'},
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsAdminOrSupervisor])
    def purge(self, request, pk=None):
        """Exclusão definitiva controlada de time (admin/supervisor)."""
        team = self.get_object()
        mode = request.data.get('mode', TeamPurgeService.MODE_SAFE)
        dry_run = str(request.data.get('dry_run', 'false')).lower() == 'true'

        summary = TeamPurgeService.summarize(team)
        payload = {
            'team_id': summary.team_id,
            'matches_total': summary.matches_total,
            'finished_matches': summary.finished_matches,
            'in_progress_matches': summary.in_progress_matches,
            'scheduled_matches': summary.scheduled_matches,
            'enrollments_total': summary.enrollments_total,
            'payments_total': summary.payments_total,
            'memberships_total': summary.memberships_total,
            'invitations_total': summary.invitations_total,
            'leave_requests_total': summary.leave_requests_total,
            'mode': mode,
        }

        if dry_run:
            return Response({'dry_run': True, 'summary': payload}, status=status.HTTP_200_OK)

        result = TeamPurgeService.purge(team, mode=mode)
        return Response(
            {
                'message': 'Purge de time concluído com sucesso.',
                'summary': {
                    'team_id': result.team_id,
                    'matches_total': result.matches_total,
                    'finished_matches': result.finished_matches,
                    'in_progress_matches': result.in_progress_matches,
                    'scheduled_matches': result.scheduled_matches,
                    'enrollments_total': result.enrollments_total,
                    'payments_total': result.payments_total,
                    'memberships_total': result.memberships_total,
                    'invitations_total': result.invitations_total,
                    'leave_requests_total': result.leave_requests_total,
                    'mode': mode,
                },
            },
            status=status.HTTP_200_OK,
        )


class TeamMembershipViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar membros de times.
    
    Endpoints:
    - GET /memberships/ - Listar membros
    - POST /memberships/ - Adicionar membro
    - GET /memberships/{id}/ - Detalhes do membro
    - PUT /memberships/{id}/ - Atualizar membro (ex: mudar role)
    - DELETE /memberships/{id}/ - Remover membro
    """
    queryset = TeamMembership.objects.all()
    serializer_class = TeamMembershipSerializer
    permission_classes = [IsAuthenticated, IsTeamMemberOrOwner]
    
    def get_queryset(self):
        """Filtra membros ativos."""
        queryset = TeamMembership.objects.filter(is_active=True)
        
        # Filtro por time
        team_id = self.request.query_params.get('team', None)
        if team_id:
            queryset = queryset.filter(team_id=team_id)
        
        # Filtro por jogador
        player_id = self.request.query_params.get('player', None)
        if player_id:
            queryset = queryset.filter(player_id=player_id)
        
        return queryset.select_related('team', 'player', 'player__user')
    
    def destroy(self, request, *args, **kwargs):
        """
        Remove o membro do time (marca como inativo e define left_at).
        """
        instance = self.get_object()
        
        # Verificar se o usuário é o dono do time ou o próprio jogador
        can_manage_roster = user_can_manage_team_roster(request.user, instance.team)
        is_self_removal = instance.player.user == request.user
        if not can_manage_roster and not is_self_removal:
            return Response(
                {'error': 'Você não tem permissão para remover este membro.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if instance.role == TeamMembership.Role.OWNER:
            return Response(
                {'error': 'O dono do time não pode ser removido por este fluxo.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        instance.is_active = False
        instance.left_at = timezone.now()
        instance.save()
        return Response(
            {'message': 'Membro removido do time com sucesso.'},
            status=status.HTTP_200_OK
        )


class TeamInvitationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar convites de times.
    
    Endpoints:
    - GET /invitations/ - Listar convites
    - POST /invitations/ - Criar convite
    - GET /invitations/{id}/ - Detalhes do convite
    - POST /invitations/{id}/accept/ - Aceitar convite
    - POST /invitations/{id}/decline/ - Recusar convite
    - DELETE /invitations/{id}/ - Cancelar convite
    """
    queryset = TeamInvitation.objects.all()
    serializer_class = TeamInvitationSerializer
    permission_classes = [IsAuthenticated, IsInvitedPlayerOrTeamOwner]
    
    def get_queryset(self):
        """
        Filtra convites por status.
        Apenas convites do usuário logado (como jogador ou dono do time) são visíveis.
        """
        user = self.request.user

        managed_team_filter = Q(team__owner=user) | Q(
            team__teammembership__player__user=user,
            team__teammembership__role=TeamMembership.Role.CAPTAIN,
            team__teammembership__is_active=True,
        )

        # Convites onde o usuário é o jogador convidado OU gestor do elenco do time
        try:
            player_profile = user.player_profile
            queryset = TeamInvitation.objects.filter(
                Q(player=player_profile) | managed_team_filter
            )
        except Exception:
            queryset = TeamInvitation.objects.filter(managed_team_filter)

        # Filtro por status
        invitation_status = self.request.query_params.get('status', None)
        if invitation_status:
            queryset = queryset.filter(status=invitation_status)

        # Filtro por time
        team_id = self.request.query_params.get('team', None)
        if team_id:
            queryset = queryset.filter(team_id=team_id)

        # Filtro por convites recebidos pelo usuário logado (pendentes)
        if self.request.query_params.get('my_invitations', None):
            try:
                player_profile = user.player_profile
                queryset = TeamInvitation.objects.filter(player=player_profile, status='PENDING')
            except Exception:
                queryset = TeamInvitation.objects.none()

        return queryset.select_related('team', 'player', 'invited_by').distinct()
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """
        Aceita o convite e adiciona o jogador ao time.
        """
        invitation = self.get_object()

        with transaction.atomic():
            invitation = TeamInvitation.objects.select_related('team', 'player', 'player__user').select_for_update().get(pk=invitation.pk)
            team = Team.objects.select_for_update().get(pk=invitation.team_id)

            # Verificar se o usuário é o jogador convidado
            if invitation.player.user != request.user:
                return Response(
                    {'error': 'Você não pode aceitar este convite.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            if invitation.status != 'PENDING':
                return Response(
                    {'error': 'Este convite não está pendente.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verificar se o jogador já pertence a outro time ativo
            if TeamMembership.objects.filter(player=invitation.player, is_active=True).exists():
                return Response(
                    {'error': 'Você já pertence a outro time. Solicite sua saída antes de aceitar um novo convite.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            membership = TeamMembership.objects.filter(
                team=team,
                player=invitation.player,
            ).select_for_update().first()

            try:
                team.ensure_has_capacity(exclude_membership_id=membership.pk if membership else None)
            except DjangoValidationError as exc:
                return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

            # Aceitar convite
            invitation.status = 'ACCEPTED'
            invitation.responded_at = timezone.now()
            invitation.save(update_fields=['status', 'responded_at'])

            # Adicionar jogador ao time
            if membership:
                membership.is_active = True
                membership.left_at = None
                membership.role = TeamMembership.Role.PLAYER
                membership.save(update_fields=['is_active', 'left_at', 'role'])
            else:
                TeamMembership.objects.create(
                    team=team,
                    player=invitation.player,
                    role=TeamMembership.Role.PLAYER,
                    is_active=True,
                )

        return Response({
            'message': 'Convite aceito com sucesso.',
            'invitation': TeamInvitationSerializer(invitation).data
        })
    
    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        """
        Recusa o convite.
        """
        invitation = self.get_object()
        
        # Verificar se o usuário é o jogador convidado
        if invitation.player.user != request.user:
            return Response(
                {'error': 'Você não pode recusar este convite.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if invitation.status != 'PENDING':
            return Response(
                {'error': 'Este convite não está pendente.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Recusar convite
        invitation.status = 'DECLINED'
        invitation.responded_at = timezone.now()
        invitation.save()
        
        return Response({
            'message': 'Convite recusado.',
            'invitation': TeamInvitationSerializer(invitation).data
        })

    def destroy(self, request, *args, **kwargs):
        """Cancela um convite pendente do time ou remove um convite próprio recebido."""
        invitation = self.get_object()

        is_player = hasattr(request.user, 'player_profile') and invitation.player == request.user.player_profile
        can_manage_roster = user_can_manage_team_roster(request.user, invitation.team)

        if not is_player and not can_manage_roster:
            return Response(
                {'error': 'Você não tem permissão para cancelar este convite.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        if invitation.status != TeamInvitation.Status.PENDING:
            return Response(
                {'error': 'Apenas convites pendentes podem ser cancelados.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        invitation.status = TeamInvitation.Status.CANCELLED
        invitation.responded_at = timezone.now()
        invitation.save(update_fields=['status', 'responded_at'])

        return Response({'message': 'Convite cancelado com sucesso.'}, status=status.HTTP_200_OK)


class FormationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar formações táticas.
    
    Endpoints:
    - GET /formations/ - Listar formações
    - POST /formations/ - Criar formação
    - GET /formations/{id}/ - Detalhes da formação
    - PUT /formations/{id}/ - Atualizar formação
    - DELETE /formations/{id}/ - Deletar formação
    - POST /formations/{id}/set_default/ - Definir como formação padrão
    """
    queryset = Formation.objects.all()
    permission_classes = [IsAuthenticated, CanManageFormation]
    
    def get_serializer_class(self):
        """Retorna o serializer apropriado para cada ação."""
        if self.action == 'create':
            return FormationCreateSerializer
        return FormationSerializer
    
    def get_queryset(self):
        """Filtra formações por time."""
        queryset = Formation.objects.all()
        
        # Filtro por time
        team_id = self.request.query_params.get('team', None)
        if team_id:
            queryset = queryset.filter(team_id=team_id)
        
        return queryset.select_related('team').prefetch_related('positions', 'positions__player')
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """
        Define esta formação como padrão para o time.
        """
        formation = self.get_object()
        
        if not user_can_manage_team_operations(request.user, formation.team):
            return Response(
                {'error': 'Apenas dono/capitão/comissão técnica podem definir a formação padrão.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Remover default de outras formações
        Formation.objects.filter(team=formation.team).update(is_default=False)
        
        # Definir esta como default
        formation.is_default = True
        formation.save()

        return Response({
            'message': 'Formação definida como padrão.',
            'formation': FormationSerializer(formation).data
        })


class TeamLeaveRequestViewSet(viewsets.GenericViewSet):
    """
    ViewSet para solicitações de saída de time.

    Endpoints:
    - POST /leave-requests/          — Jogador cria solicitação de saída
    - GET  /leave-requests/          — Lista solicitações (dono: todas do time; jogador: as suas)
    - POST /leave-requests/{id}/approve/ — Dono aprova (jogador sai do time)
    - POST /leave-requests/{id}/reject/  — Dono recusa (jogador continua)
    - DELETE /leave-requests/{id}/       — Jogador cancela sua solicitação pendente
    """
    queryset = TeamLeaveRequest.objects.all()
    serializer_class = TeamLeaveRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = TeamLeaveRequest.objects.select_related('team', 'player', 'player__user', 'resolved_by')

        # Dono do time vê solicitações dos seus times
        # Jogador vê as próprias
        try:
            player_profile = user.player_profile
            qs = qs.filter(
                Q(team__owner=user) | Q(player=player_profile)
            )
        except Exception:
            qs = qs.filter(team__owner=user)

        # Filtro opcional por time
        team_id = self.request.query_params.get('team')
        if team_id:
            qs = qs.filter(team_id=team_id)

        # Filtro opcional por status
        req_status = self.request.query_params.get('status')
        if req_status:
            qs = qs.filter(status=req_status)

        return qs

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """Jogador cria uma solicitação de saída do time."""
        user = request.user

        try:
            player_profile = user.player_profile
        except Exception:
            return Response(
                {'error': 'Você precisa ter um perfil de jogador para solicitar saída.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Encontrar membership ativa
        membership = TeamMembership.objects.filter(
            player=player_profile, is_active=True
        ).select_related('team').first()

        if not membership:
            return Response(
                {'error': 'Você não faz parte de nenhum time.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        team = membership.team

        # Impedir que o dono solicite saída do próprio time
        if team.owner == user:
            return Response(
                {'error': 'O dono do time não pode solicitar saída. Use a opção de excluir o time.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar solicitação pendente existente
        if TeamLeaveRequest.objects.filter(team=team, player=player_profile, status='PENDING').exists():
            return Response(
                {'error': 'Você já possui uma solicitação de saída pendente para este time.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        reason = request.data.get('reason', '')
        leave_request = TeamLeaveRequest.objects.create(
            team=team,
            player=player_profile,
            reason=reason,
        )

        return Response(
            TeamLeaveRequestSerializer(leave_request).data,
            status=status.HTTP_201_CREATED
        )

    def destroy(self, request, *args, **kwargs):
        """Jogador cancela sua própria solicitação pendente."""
        leave_request = self.get_object()

        try:
            player_profile = request.user.player_profile
        except Exception:
            return Response({'error': 'Acesso negado.'}, status=status.HTTP_403_FORBIDDEN)

        if leave_request.player != player_profile:
            return Response({'error': 'Você não pode cancelar esta solicitação.'}, status=status.HTTP_403_FORBIDDEN)

        if leave_request.status != 'PENDING':
            return Response({'error': 'Apenas solicitações pendentes podem ser canceladas.'}, status=status.HTTP_400_BAD_REQUEST)

        leave_request.delete()
        return Response({'message': 'Solicitação cancelada.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Dono do time aprova a saída — jogador é removido do time."""
        leave_request = self.get_object()

        if not user_can_manage_team_roster(request.user, leave_request.team):
            return Response(
                {'error': 'Apenas o dono ou capitão do time pode aprovar solicitações de saída.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if leave_request.status != 'PENDING':
            return Response(
                {'error': 'Esta solicitação já foi processada.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Aprovar: desativar membership
        TeamMembership.objects.filter(
            team=leave_request.team,
            player=leave_request.player,
            is_active=True
        ).update(is_active=False, left_at=timezone.now())

        leave_request.status = 'APPROVED'
        leave_request.resolved_at = timezone.now()
        leave_request.resolved_by = request.user
        leave_request.save(update_fields=['status', 'resolved_at', 'resolved_by'])

        return Response({
            'message': f'{leave_request.player} foi removido do time.',
            'leave_request': TeamLeaveRequestSerializer(leave_request).data
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Dono do time recusa a saída — jogador continua no time."""
        leave_request = self.get_object()

        if not user_can_manage_team_roster(request.user, leave_request.team):
            return Response(
                {'error': 'Apenas o dono ou capitão do time pode recusar solicitações de saída.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if leave_request.status != 'PENDING':
            return Response(
                {'error': 'Esta solicitação já foi processada.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        leave_request.status = 'REJECTED'
        leave_request.resolved_at = timezone.now()
        leave_request.resolved_by = request.user
        leave_request.save(update_fields=['status', 'resolved_at', 'resolved_by'])

        return Response({
            'message': 'Solicitação de saída recusada. O jogador permanece no time.',
            'leave_request': TeamLeaveRequestSerializer(leave_request).data
        })
