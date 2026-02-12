from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import PlayerProfile, TeamOwnerProfile

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer para o modelo User.
    """
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    user_type_display = serializers.CharField(source='get_user_type_display', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'user_type',
            'user_type_display',
            'platform',
            'is_active',
            'date_joined',
            'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para criação de usuário com senha.
    """
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = [
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'platform',
            'user_type'
        ]
    
    def validate(self, data):
        """Valida se as senhas conferem."""
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'As senhas não conferem.'
            })
        return data
    
    def create(self, validated_data):
        """Cria o usuário com senha encriptada."""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        # Cria o perfil correspondente
        if user.user_type == 'PLAYER':
            PlayerProfile.objects.create(user=user)
        elif user.user_type == 'TEAM_OWNER':
            TeamOwnerProfile.objects.create(user=user)
        elif user.user_type == 'SUPERVISOR':
            # Supervisores não precisam de perfil específico
            pass
        
        return user


class PlayerProfileSerializer(serializers.ModelSerializer):
    """
    Serializer para perfil de jogador.
    """
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)
    
    primary_position_display = serializers.CharField(
        source='get_primary_position_display',
        read_only=True
    )
    secondary_position_display = serializers.CharField(
        source='get_secondary_position_display',
        read_only=True
    )
    
    # Estatísticas
    total_games = serializers.IntegerField(read_only=True)
    total_goals = serializers.IntegerField(read_only=True)
    total_assists = serializers.IntegerField(read_only=True)
    win_rate = serializers.FloatField(read_only=True)
    
    class Meta:
        model = PlayerProfile
        fields = [
            'id',
            'user',
            'user_id',
            'player_name',
            'gamer_tag',
            'avatar',
            'birth_date',
            'whatsapp',
            'country',
            'language',
            'primary_position',
            'primary_position_display',
            'secondary_position',
            'secondary_position_display',
            'shirt_number',
            'is_active',
            'total_games',
            'total_goals',
            'total_assists',
            'win_rate',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_shirt_number(self, value):
        """Valida o número da camisa."""
        if value is not None and (value < 1 or value > 99):
            raise serializers.ValidationError('Número da camisa deve estar entre 1 e 99.')
        return value


class PlayerProfileListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de jogadores.
    """
    user_email = serializers.EmailField(source='user.email', read_only=True)
    primary_position_display = serializers.CharField(
        source='get_primary_position_display',
        read_only=True
    )
    
    class Meta:
        model = PlayerProfile
        fields = [
            'id',
            'player_name',
            'gamer_tag',
            'user_email',
            'avatar',
            'primary_position',
            'primary_position_display',
            'country',
            'is_active'
        ]


class TeamOwnerProfileSerializer(serializers.ModelSerializer):
    """
    Serializer para perfil de dono de time.
    """
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(write_only=True, required=False)
    
    # Contagem de times
    teams_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TeamOwnerProfile
        fields = [
            'id',
            'user',
            'user_id',
            'bio',
            'avatar',
            'is_active',
            'teams_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_teams_count(self, obj):
        """Retorna o número de times do dono."""
        return obj.user.owned_teams.count()


class TeamOwnerProfileListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de donos de time.
    """
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    teams_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TeamOwnerProfile
        fields = [
            'id',
            'user_email',
            'user_name',
            'avatar',
            'teams_count',
            'is_active'
        ]
    
    def get_teams_count(self, obj):
        """Retorna o número de times do dono."""
        return obj.user.owned_teams.count()


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Serializer detalhado do usuário com perfil aninhado.
    """
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    user_type_display = serializers.CharField(source='get_user_type_display', read_only=True)
    player_profile = PlayerProfileSerializer(read_only=True)
    team_owner_profile = TeamOwnerProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'user_type',
            'user_type_display',
            'platform',
            'is_active',
            'date_joined',
            'last_login',
            'player_profile',
            'team_owner_profile'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer para mudança de senha.
    """
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True, write_only=True, min_length=8)
    
    def validate_old_password(self, value):
        """Valida a senha antiga."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Senha atual incorreta.')
        return value
    
    def validate(self, data):
        """Valida se as novas senhas conferem."""
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'As senhas não conferem.'
            })
        return data
    
    def save(self):
        """Atualiza a senha do usuário."""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user
