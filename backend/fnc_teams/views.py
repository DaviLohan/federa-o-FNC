from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count
from django.utils import timezone

from .models import Team, TeamMembership, TeamInvitation, Formation, FormationPosition
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
    TeamMembershipSerializer,
    TeamInvitationSerializer,
    FormationSerializer,
    FormationCreateSerializer
)


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
    
    def get_serializer_class(self):
        """Retorna o serializer apropriado para cada ação."""
        if self.action == 'list':
            return TeamListSerializer
        elif self.action == 'retrieve':
            return TeamDetailSerializer
        return TeamSerializer
    
    def get_queryset(self):
        """Filtra times ativos onde o usuário é dono OU membro."""
        queryset = Team.objects.filter(is_active=True)
        user = self.request.user
        
        # Filtro por dono específico (se passado como query param)
        owner_id = self.request.query_params.get('owner', None)
        if owner_id:
            queryset = queryset.filter(owner_id=owner_id)
        else:
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
        
        return queryset.select_related('owner')
    
    def perform_create(self, serializer):
        """
        Define o dono do time como o usuário atual.
        Se o usuário for PLAYER, promove automaticamente para TEAM_OWNER (Manager).
        """
        user = self.request.user
        
        # Auto-promover jogador para Manager ao criar time
        if user.user_type == 'PLAYER':
            user.user_type = 'TEAM_OWNER'
            user.save(update_fields=['user_type'])
        
        serializer.save(owner=user)
    
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
    
    @action(detail=False, methods=['get'], url_path='my-team')
    def my_team(self, request):
        """
        Retorna o time do usuário logado (como dono ou membro).
        """
        user = request.user
        
        # Buscar time onde é dono
        team_as_owner = Team.objects.filter(owner=user, is_active=True).first()
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
                serializer = TeamDetailSerializer(membership.team)
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
        team = self.get_object()
        
        # Verificar se o usuário é o dono do time
        if team.owner != request.user:
            return Response(
                {'error': 'Apenas o dono do time pode convidar jogadores.'},
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
            'invited_by_id': request.user.id
        }
        
        serializer = TeamInvitationSerializer(data=invitation_data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """
        Desativa o time ao invés de deletar.
        """
        instance = self.get_object()
        
        # Verificar se o usuário é o dono do time
        if instance.owner != request.user:
            return Response(
                {'error': 'Apenas o dono do time pode desativá-lo.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        instance.is_active = False
        instance.save()
        return Response(
            {'message': 'Time desativado com sucesso.'},
            status=status.HTTP_200_OK
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
        if instance.team.owner != request.user and instance.player.user != request.user:
            return Response(
                {'error': 'Você não tem permissão para remover este membro.'},
                status=status.HTTP_403_FORBIDDEN
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
        """Filtra convites por status."""
        queryset = TeamInvitation.objects.all()
        
        # Filtro por status
        invitation_status = self.request.query_params.get('status', None)
        if invitation_status:
            queryset = queryset.filter(status=invitation_status)
        
        # Filtro por time
        team_id = self.request.query_params.get('team', None)
        if team_id:
            queryset = queryset.filter(team_id=team_id)
        
        # Filtro por jogador (convites recebidos pelo usuário)
        if self.request.query_params.get('my_invitations', None):
            # Pegar o PlayerProfile do usuário atual
            try:
                player_profile = self.request.user.player_profile
                queryset = queryset.filter(player=player_profile, status='PENDING')
            except:
                queryset = queryset.none()
        
        return queryset.select_related('team', 'player', 'invited_by')
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """
        Aceita o convite e adiciona o jogador ao time.
        """
        invitation = self.get_object()
        
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
        
        # Aceitar convite
        invitation.status = 'ACCEPTED'
        invitation.responded_at = timezone.now()
        invitation.save()
        
        # Adicionar jogador ao time
        TeamMembership.objects.create(
            team=invitation.team,
            player=invitation.player,
            role='PLAYER'
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
        
        # Verificar se o usuário é o dono do time
        if formation.team.owner != request.user:
            return Response(
                {'error': 'Apenas o dono do time pode definir a formação padrão.'},
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
