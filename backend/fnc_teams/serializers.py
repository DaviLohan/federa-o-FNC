from rest_framework import serializers
from .models import Team, TeamMembership, TeamInvitation, TeamLeaveRequest, Formation, FormationPosition
from users.serializers import UserSerializer, PlayerProfileListSerializer


class TeamSerializer(serializers.ModelSerializer):
    """
    Serializer para o modelo Team.
    """
    owner = UserSerializer(read_only=True)
    owner_id = serializers.IntegerField(write_only=True, required=False)
    
    # Campos calculados
    player_count = serializers.IntegerField(read_only=True)
    has_active_championship = serializers.BooleanField(read_only=True)

    # Campo de imagem declarado explicitamente para garantir required=False
    # em PUT/PATCH (sem isso, DRF pode exigir o campo em updates completos)
    logo = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = Team
        fields = [
            'id',
            'owner',
            'owner_id',
            'name',
            'abbreviation',
            'logo',
            'description',
            'foundation_date',
            'is_active',
            'player_count',
            'has_active_championship',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'foundation_date', 'created_at', 'updated_at']
    
    def validate_name(self, value):
        """Valida unicidade do nome."""
        if Team.objects.filter(name=value).exclude(pk=self.instance.pk if self.instance else None).exists():
            raise serializers.ValidationError('Já existe um time com este nome.')
        return value

    def validate_abbreviation(self, value):
        """Valida a sigla."""
        if len(value) > 5:
            raise serializers.ValidationError('A sigla deve ter no máximo 5 caracteres.')
        return value.upper()

    def validate(self, data):
        """Valida que o usuário ainda não possui um time ativo como dono."""
        request = self.context.get('request')
        # Apenas na criação (não na edição)
        if request and not self.instance:
            if Team.objects.filter(owner=request.user, is_active=True).exists():
                raise serializers.ValidationError(
                    'Você já possui um time ativo. Um usuário só pode ser dono de 1 time.'
                )
        return data


class TeamListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de times.
    """
    owner = UserSerializer(read_only=True)
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    player_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Team
        fields = [
            'id',
            'name',
            'abbreviation',
            'logo',
            'owner',
            'owner_name',
            'player_count',
            'is_active',
            'foundation_date'
        ]


class TeamMembershipSerializer(serializers.ModelSerializer):
    """
    Serializer para membros do time.
    """
    team = TeamListSerializer(read_only=True)
    team_id = serializers.IntegerField(write_only=True)
    player = PlayerProfileListSerializer(read_only=True)
    player_id = serializers.IntegerField(write_only=True)
    
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = TeamMembership
        fields = [
            'id',
            'team',
            'team_id',
            'player',
            'player_id',
            'role',
            'role_display',
            'is_active',
            'joined_at',
            'left_at'
        ]
        read_only_fields = ['id', 'joined_at']
    
    def validate(self, data):
        """Valida se o jogador já não está no time."""
        team = data.get('team_id')
        player = data.get('player_id')
        
        if TeamMembership.objects.filter(team_id=team, player_id=player, is_active=True).exists():
            raise serializers.ValidationError('Este jogador já é membro deste time.')
        
        return data


class TeamInvitationSerializer(serializers.ModelSerializer):
    """
    Serializer para convites de time.
    """
    team = TeamListSerializer(read_only=True)
    team_id = serializers.IntegerField(write_only=True)
    player = PlayerProfileListSerializer(read_only=True)
    player_id = serializers.IntegerField(write_only=True)
    invited_by = UserSerializer(read_only=True)
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = TeamInvitation
        fields = [
            'id',
            'team',
            'team_id',
            'player',
            'player_id',
            'invited_by',
            'message',
            'status',
            'status_display',
            'created_at',
            'responded_at'
        ]
        read_only_fields = ['id', 'invited_by', 'created_at', 'responded_at']
    
    def validate(self, data):
        """Valida se não existe convite pendente e se o jogador não está em outro time."""
        team = data.get('team_id')
        player = data.get('player_id')

        if TeamInvitation.objects.filter(
            team_id=team,
            player_id=player,
            status='PENDING'
        ).exists():
            raise serializers.ValidationError('Já existe um convite pendente para este jogador.')

        # Valida se o jogador já não está no time
        if TeamMembership.objects.filter(
            team_id=team,
            player_id=player,
            is_active=True
        ).exists():
            raise serializers.ValidationError('Este jogador já é membro do time.')

        # Valida se o jogador já pertence a QUALQUER outro time ativo
        if TeamMembership.objects.filter(
            player_id=player,
            is_active=True
        ).exists():
            raise serializers.ValidationError(
                'Este jogador já pertence a outro time. Um jogador só pode fazer parte de 1 time.'
            )

        return data


class FormationPositionSerializer(serializers.ModelSerializer):
    """
    Serializer para posições na formação.
    """
    player = PlayerProfileListSerializer(read_only=True)
    player_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = FormationPosition
        fields = [
            'id',
            'player',
            'player_id',
            'position',
            'x_position',
            'y_position'
        ]
    
    def validate_position(self, value):
        """Valida a posição."""
        valid_positions = [
            'GK', 'CB', 'LB', 'RB', 'LWB', 'RWB',
            'CDM', 'CM', 'CAM', 'LM', 'RM',
            'LW', 'RW', 'CF', 'ST'
        ]
        if value.upper() not in valid_positions:
            raise serializers.ValidationError(f'Posição inválida. Use uma dessas: {", ".join(valid_positions)}')
        return value.upper()
    
    def validate_x_position(self, value):
        """Valida coordenada X."""
        if not 0 <= value <= 100:
            raise serializers.ValidationError('Posição X deve estar entre 0 e 100.')
        return value
    
    def validate_y_position(self, value):
        """Valida coordenada Y."""
        if not 0 <= value <= 100:
            raise serializers.ValidationError('Posição Y deve estar entre 0 e 100.')
        return value


class FormationSerializer(serializers.ModelSerializer):
    """
    Serializer para formações táticas.
    """
    team = TeamListSerializer(read_only=True)
    team_id = serializers.IntegerField(write_only=True)
    positions = FormationPositionSerializer(many=True, read_only=True)
    
    schema_display = serializers.CharField(source='get_schema_display', read_only=True)
    positions_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Formation
        fields = [
            'id',
            'team',
            'team_id',
            'name',
            'schema',
            'schema_display',
            'is_default',
            'positions',
            'positions_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_positions_count(self, obj):
        """Retorna o número de posições preenchidas."""
        return obj.positions.count()
    
    def validate(self, data):
        """Valida se há apenas uma formação padrão por time."""
        if data.get('is_default', False):
            team_id = data.get('team_id')
            if Formation.objects.filter(team_id=team_id, is_default=True).exclude(
                pk=self.instance.pk if self.instance else None
            ).exists():
                # Vai desativar a outra formação padrão automaticamente no save do model
                pass
        
        return data


class FormationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para criar formação com posições.
    """
    positions = FormationPositionSerializer(many=True, required=False)
    
    class Meta:
        model = Formation
        fields = [
            'team_id',
            'name',
            'schema',
            'is_default',
            'positions'
        ]
    
    def create(self, validated_data):
        """Cria a formação com suas posições."""
        positions_data = validated_data.pop('positions', [])
        formation = Formation.objects.create(**validated_data)
        
        for position_data in positions_data:
            FormationPosition.objects.create(formation=formation, **position_data)
        
        return formation


class TeamDetailSerializer(serializers.ModelSerializer):
    """
    Serializer detalhado do time com membros e formações.
    """
    owner = UserSerializer(read_only=True)
    members = serializers.SerializerMethodField()
    formations = FormationSerializer(many=True, read_only=True)
    
    player_count = serializers.IntegerField(read_only=True)
    has_active_championship = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Team
        fields = [
            'id',
            'owner',
            'name',
            'abbreviation',
            'logo',
            'description',
            'foundation_date',
            'is_active',
            'player_count',
            'has_active_championship',
            'members',
            'formations',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'foundation_date', 'created_at', 'updated_at']
    
    def get_members(self, obj):
        """Retorna os membros ativos do time."""
        memberships = getattr(obj, 'prefetched_active_memberships', None)
        if memberships is None:
            memberships = TeamMembership.objects.filter(
                team=obj,
                is_active=True
            ).select_related('player', 'player__user')
        return TeamMembershipSerializer(memberships, many=True).data


class TeamLeaveRequestSerializer(serializers.ModelSerializer):
    """
    Serializer para solicitações de saída de time.
    """
    player = PlayerProfileListSerializer(read_only=True)
    team = TeamListSerializer(read_only=True)
    resolved_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = TeamLeaveRequest
        fields = [
            'id',
            'team',
            'player',
            'reason',
            'status',
            'status_display',
            'created_at',
            'resolved_at',
            'resolved_by_name',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'resolved_at', 'resolved_by_name']

    def get_resolved_by_name(self, obj):
        if obj.resolved_by:
            return obj.resolved_by.get_full_name() or obj.resolved_by.email
        return None
