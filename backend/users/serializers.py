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
            'cpf',
            'is_active',
            'is_email_verified',
            'date_joined',
            'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_email_verified']


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para criação de usuário com senha e dados do perfil de jogador.
    Registro em uma única chamada — conta + perfil.
    Se o email pertencer a um usuário desativado, reativa a conta com os novos dados.
    """
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    # Campos do perfil de jogador (write-only, opcionais no serializer mas
    # obrigatórios na validação se user_type == PLAYER)
    player_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    gamer_tag = serializers.CharField(write_only=True, required=False, allow_blank=True)
    shirt_number = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    primary_position = serializers.CharField(write_only=True, required=False, allow_blank=True)
    secondary_position = serializers.CharField(write_only=True, required=False, allow_blank=True)
    birth_date = serializers.DateField(write_only=True, required=False, allow_null=True)
    whatsapp = serializers.CharField(write_only=True, required=False, allow_blank=True)
    country = serializers.CharField(write_only=True, required=False, allow_blank=True)
    language = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = [
            'email',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'platform',
            'user_type',
            # Campos do perfil
            'player_name',
            'gamer_tag',
            'shirt_number',
            'primary_position',
            'secondary_position',
            'birth_date',
            'whatsapp',
            'country',
            'language',
        ]
        extra_kwargs = {
            # Remove o UniqueValidator automático do DRF para o campo email.
            # A unicidade é verificada manualmente em validate_email(),
            # permitindo reativar contas desativadas com o mesmo email.
            'email': {'validators': []},
        }
    
    def validate_email(self, value):
        """
        Permite reuso de email de conta desativada.
        Bloqueia apenas emails de contas ativas.
        """
        normalized = User.objects.normalize_email(value)
        existing = User.objects.filter(email__iexact=normalized).first()
        if existing and existing.is_active:
            raise serializers.ValidationError('usuário com este email já existe.')
        return value

    def validate_shirt_number(self, value):
        """Valida o número da camisa."""
        if value is not None and (value < 1 or value > 99):
            raise serializers.ValidationError('Número da camisa deve estar entre 1 e 99.')
        return value

    def validate(self, data):
        """Valida se as senhas conferem e se os campos de perfil estão presentes para PLAYER."""
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'As senhas não conferem.'
            })

        # Para jogadores, campos essenciais do perfil são obrigatórios
        if data.get('user_type', 'PLAYER') == 'PLAYER':
            required_profile = ['player_name', 'gamer_tag']
            missing = [f for f in required_profile if not data.get(f)]
            if missing:
                raise serializers.ValidationError({
                    f: 'Este campo é obrigatório para jogadores.'
                    for f in missing
                })

        return data
    
    def create(self, validated_data):
        """
        Cria o usuário ou reativa uma conta desativada com os novos dados.
        Também cria/atualiza o perfil de jogador com os dados enviados.
        """
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        email = validated_data['email']

        # Extrair campos do perfil de jogador
        profile_fields = [
            'player_name', 'gamer_tag', 'shirt_number', 'primary_position',
            'secondary_position', 'birth_date', 'whatsapp', 'country', 'language',
        ]
        profile_data = {}
        for field in profile_fields:
            value = validated_data.pop(field, None)
            if value is not None and value != '':
                profile_data[field] = value

        # Verificar se existe conta desativada com este email
        existing_user = User.objects.filter(email__iexact=email).first()

        if existing_user and not existing_user.is_active:
            # Reativar conta com os novos dados
            for field, value in validated_data.items():
                setattr(existing_user, field, value)
            existing_user.set_password(password)
            existing_user.is_active = True
            existing_user.is_email_verified = False
            existing_user.save()

            # Atualizar perfil de jogador se existir
            if hasattr(existing_user, 'player_profile') and profile_data:
                profile = existing_user.player_profile
                for field, value in profile_data.items():
                    setattr(profile, field, value)
                profile.is_active = True
                profile.save()
            elif existing_user.user_type == 'PLAYER' and not hasattr(existing_user, 'player_profile'):
                PlayerProfile.objects.create(user=existing_user, **profile_data)

            # Reativar perfil de dono de time se existir
            if hasattr(existing_user, 'team_owner_profile'):
                existing_user.team_owner_profile.is_active = True
                existing_user.team_owner_profile.save()

            return existing_user

        # Criar usuário novo normalmente
        user = User.objects.create_user(password=password, **validated_data)
        
        # Cria o perfil correspondente com os dados enviados
        if user.user_type == 'PLAYER':
            PlayerProfile.objects.create(user=user, **profile_data)
        elif user.user_type == 'TEAM_OWNER':
            TeamOwnerProfile.objects.create(user=user)
        elif user.user_type == 'SUPERVISOR':
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

    # Campo de imagem declarado explicitamente para garantir required=False
    # em PUT/PATCH (sem isso, DRF pode exigir o campo em updates completos)
    avatar = serializers.ImageField(required=False, allow_null=True)
    
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
    user_id = serializers.IntegerField(source='user.id', read_only=True)
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
            'user_id',
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
            'cpf',
            'is_active',
            'is_email_verified',
            'date_joined',
            'last_login',
            'player_profile',
            'team_owner_profile'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_email_verified']


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


# ──────────────────────────────────────────────────────────────────────────────
# Serializers para o fluxo de autenticação por email
# ──────────────────────────────────────────────────────────────────────────────


class VerifyEmailSerializer(serializers.Serializer):
    """Serializer para verificação de email com código de 6 dígitos."""
    email = serializers.EmailField(required=True)
    code = serializers.CharField(required=True, min_length=6, max_length=6)

    def validate_code(self, value):
        """Garante que o código contém apenas dígitos."""
        if not value.isdigit():
            raise serializers.ValidationError('O código deve conter apenas números.')
        return value


class ResendVerificationSerializer(serializers.Serializer):
    """Serializer para reenvio do código de verificação."""
    email = serializers.EmailField(required=True)


class ForgotPasswordSerializer(serializers.Serializer):
    """Serializer para solicitação de redefinição de senha."""
    email = serializers.EmailField(required=True)


class ResetPasswordSerializer(serializers.Serializer):
    """Serializer para redefinição de senha com código."""
    email = serializers.EmailField(required=True)
    code = serializers.CharField(required=True, min_length=6, max_length=6)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(required=True, write_only=True, min_length=8)

    def validate_code(self, value):
        """Garante que o código contém apenas dígitos."""
        if not value.isdigit():
            raise serializers.ValidationError('O código deve conter apenas números.')
        return value

    def validate(self, data):
        """Valida se as senhas conferem."""
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': 'As senhas não conferem.'
            })
        return data
