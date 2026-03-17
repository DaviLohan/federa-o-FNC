from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model, authenticate
from django.db.models import Q

from .models import PlayerProfile, TeamOwnerProfile
from .permissions import IsOwnerOrReadOnly, IsOwner
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserDetailSerializer,
    PlayerProfileSerializer,
    PlayerProfileListSerializer,
    TeamOwnerProfileSerializer,
    TeamOwnerProfileListSerializer,
    ChangePasswordSerializer
)

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar usuários.
    
    Endpoints:
    - GET /users/ - Listar usuários
    - POST /users/ - Registrar novo usuário (sem autenticação)
    - GET /users/{id}/ - Detalhes do usuário
    - PUT /users/{id}/ - Atualizar usuário
    - DELETE /users/{id}/ - Desativar usuário
    - POST /users/login/ - Login (sem autenticação)
    - POST /users/change_password/ - Alterar senha (autenticado)
    - GET /users/me/ - Dados do usuário atual (autenticado)
    """
    queryset = User.objects.all()
    
    def get_serializer_class(self):
        """Retorna o serializer apropriado para cada ação."""
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action == 'retrieve':
            return UserDetailSerializer
        return UserSerializer
    
    def get_permissions(self):
        """Define permissões por ação."""
        if self.action in ['create', 'login']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        """Filtra usuários ativos e permite busca."""
        queryset = User.objects.filter(is_active=True)
        
        # Filtro por tipo de usuário
        user_type = self.request.query_params.get('user_type', None)
        if user_type:
            queryset = queryset.filter(user_type=user_type)
        
        # Busca por nome ou email
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        return queryset.select_related('player_profile', 'team_owner_profile')
    
    def create(self, request, *args, **kwargs):
        """
        Registra novo usuário e retorna token de autenticação.
        
        Body:
            - email: Email do usuário
            - password: Senha
            - password_confirm: Confirmação da senha
            - first_name: Primeiro nome
            - last_name: Sobrenome
            - user_type: PLAYER ou TEAM_OWNER
            - platform: PLAYSTATION, XBOX, PC
        
        Retorna:
            - token: Token de autenticação
            - user: Dados completos do usuário
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Criar ou recuperar token (get_or_create para suportar reativação)
        token, _ = Token.objects.get_or_create(user=user)
        
        # Retornar usuário com token
        user_serializer = UserDetailSerializer(user)
        headers = self.get_success_headers(serializer.data)
        
        return Response({
            'message': 'Usuário registrado com sucesso.',
            'token': token.key,
            'user': user_serializer.data
        }, status=status.HTTP_201_CREATED, headers=headers)
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        """
        Realiza login do usuário e retorna token de autenticação.
        
        Body:
            - email: Email do usuário
            - password: Senha do usuário
        
        Retorna:
            - token: Token de autenticação
            - user: Dados completos do usuário
        """
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'error': 'Email e senha são obrigatórios.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(request, email=email, password=password)
        
        if user is None:
            return Response(
                {'error': 'Credenciais inválidas.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            return Response(
                {'error': 'Usuário desativado.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Criar ou recuperar token
        token, created = Token.objects.get_or_create(user=user)
        
        serializer = UserDetailSerializer(user)
        return Response({
            'message': 'Login realizado com sucesso.',
            'token': token.key,
            'user': serializer.data
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """
        Retorna os dados do usuário autenticado.
        """
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def logout(self, request):
        """
        Faz logout do usuário deletando o token de autenticação.
        """
        try:
            # Deletar o token do usuário
            request.user.auth_token.delete()
            return Response({
                'message': 'Logout realizado com sucesso.'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'error': 'Erro ao fazer logout.'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """
        Altera a senha do usuário autenticado.
        
        Requer: old_password, new_password, new_password_confirm
        """
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Senha alterada com sucesso.'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """
        Desativa o usuário ao invés de deletar.
        """
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(
            {'message': 'Usuário desativado com sucesso.'},
            status=status.HTTP_200_OK
        )


class PlayerProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar perfis de jogadores.
    
    Endpoints:
    - GET /player-profiles/ - Listar jogadores
    - POST /player-profiles/ - Criar perfil de jogador
    - GET /player-profiles/{id}/ - Detalhes do jogador
    - PUT /player-profiles/{id}/ - Atualizar perfil
    - DELETE /player-profiles/{id}/ - Desativar perfil
    - GET /player-profiles/{id}/statistics/ - Estatísticas do jogador
    """
    queryset = PlayerProfile.objects.all()
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_serializer_class(self):
        """Retorna o serializer apropriado para cada ação."""
        if self.action == 'list':
            return PlayerProfileListSerializer
        return PlayerProfileSerializer
    
    def get_queryset(self):
        """Filtra jogadores ativos e permite busca."""
        queryset = PlayerProfile.objects.filter(is_active=True)
        
        # Filtro por posição
        position = self.request.query_params.get('position', None)
        if position:
            queryset = queryset.filter(
                Q(primary_position=position) |
                Q(secondary_position=position)
            )
        
        # Filtro por país
        country = self.request.query_params.get('country', None)
        if country:
            queryset = queryset.filter(country=country)
        
        # Busca por nome ou gamer tag
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(player_name__icontains=search) |
                Q(gamer_tag__icontains=search) |
                Q(user__email__icontains=search)
            )
        
        return queryset.select_related('user')
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """
        Retorna estatísticas detalhadas do jogador.
        """
        player = self.get_object()
        
        # Buscar estatísticas do player_stats app
        from player_stats.models import PlayerStatistics, SeasonSummary
        
        stats = PlayerStatistics.objects.filter(player=player).select_related('championship')
        summaries = SeasonSummary.objects.filter(player=player).order_by('-season_year')
        
        from player_stats.serializers import PlayerStatisticsSerializer, SeasonSummarySerializer
        
        return Response({
            'player': PlayerProfileSerializer(player).data,
            'statistics_by_championship': PlayerStatisticsSerializer(stats, many=True).data,
            'season_summaries': SeasonSummarySerializer(summaries, many=True).data
        })
    
    def destroy(self, request, *args, **kwargs):
        """
        Desativa o perfil ao invés de deletar.
        """
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(
            {'message': 'Perfil de jogador desativado com sucesso.'},
            status=status.HTTP_200_OK
        )


class TeamOwnerProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar perfis de donos de time.
    
    Endpoints:
    - GET /team-owner-profiles/ - Listar donos de time
    - POST /team-owner-profiles/ - Criar perfil de dono
    - GET /team-owner-profiles/{id}/ - Detalhes do dono
    - PUT /team-owner-profiles/{id}/ - Atualizar perfil
    - DELETE /team-owner-profiles/{id}/ - Desativar perfil
    - GET /team-owner-profiles/{id}/teams/ - Times do dono
    """
    queryset = TeamOwnerProfile.objects.all()
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_serializer_class(self):
        """Retorna o serializer apropriado para cada ação."""
        if self.action == 'list':
            return TeamOwnerProfileListSerializer
        return TeamOwnerProfileSerializer
    
    def get_queryset(self):
        """Filtra donos ativos e permite busca."""
        queryset = TeamOwnerProfile.objects.filter(is_active=True)
        
        # Busca por nome ou email
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(user__email__icontains=search) |
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search)
            )
        
        return queryset.select_related('user')
    
    @action(detail=True, methods=['get'])
    def teams(self, request, pk=None):
        """
        Retorna todos os times do dono.
        """
        owner = self.get_object()
        teams = owner.user.owned_teams.all()
        
        from fnc_teams.serializers import TeamSerializer
        
        return Response({
            'owner': TeamOwnerProfileSerializer(owner).data,
            'teams': TeamSerializer(teams, many=True).data
        })
    
    def destroy(self, request, *args, **kwargs):
        """
        Desativa o perfil ao invés de deletar.
        """
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response(
            {'message': 'Perfil de dono de time desativado com sucesso.'},
            status=status.HTTP_200_OK
        )
