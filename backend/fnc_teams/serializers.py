from rest_framework import serializers
from .models import Team, TeamMembership, TeamInvitation, TeamLeaveRequest, Formation, FormationPosition
from users.serializers import UserSerializer, PlayerProfileListSerializer
from ea_integration.ea_client import EAApiError, EAProClubsClient
from ea_integration.models import EAClub

DEFAULT_LINEUP_STYLE = {
    'outfield_primary': '#D6A11E',
    'outfield_secondary': '#111827',
    'goalkeeper_primary': '#22C55E',
    'text_color': '#FFFFFF',
    'accent_color': '#F3D36B',
    'title': 'Titular',
    'subtitle': '',
}


class TeamEAClubSerializer(serializers.ModelSerializer):
    platform_display = serializers.CharField(source='get_platform_display', read_only=True)

    class Meta:
        model = EAClub
        fields = ['ea_club_id', 'platform', 'platform_display', 'name']


class TeamLineupStyleSerializer(serializers.Serializer):
    outfield_primary = serializers.RegexField(r'^#(?:[0-9a-fA-F]{6})$', required=False)
    outfield_secondary = serializers.RegexField(r'^#(?:[0-9a-fA-F]{6})$', required=False)
    goalkeeper_primary = serializers.RegexField(r'^#(?:[0-9a-fA-F]{6})$', required=False)
    text_color = serializers.RegexField(r'^#(?:[0-9a-fA-F]{6})$', required=False)
    accent_color = serializers.RegexField(r'^#(?:[0-9a-fA-F]{6})$', required=False)
    title = serializers.CharField(required=False, allow_blank=False, max_length=40)
    subtitle = serializers.CharField(required=False, allow_blank=True, max_length=60)

    def validate_title(self, value):
        return value.strip()

    def validate_subtitle(self, value):
        return value.strip()


class TeamLineupStyleResponseSerializer(serializers.Serializer):
    outfield_primary = serializers.CharField()
    outfield_secondary = serializers.CharField()
    goalkeeper_primary = serializers.CharField()
    text_color = serializers.CharField()
    accent_color = serializers.CharField()
    title = serializers.CharField()
    subtitle = serializers.CharField(allow_blank=True)


class TeamSerializer(serializers.ModelSerializer):
    """
    Serializer para o modelo Team.
    """
    owner = UserSerializer(read_only=True)
    owner_id = serializers.IntegerField(write_only=True, required=False)
    ea_club = TeamEAClubSerializer(read_only=True)
    ea_club_id = serializers.CharField(write_only=True, required=False, allow_blank=False)
    ea_platform = serializers.ChoiceField(
        write_only=True,
        required=False,
        choices=EAClub.Platform.choices,
    )
    lineup_visual_preferences = serializers.SerializerMethodField()
    
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
            'ea_club',
            'ea_club_id',
            'ea_platform',
            'lineup_visual_preferences',
            'is_active',
            'player_count',
            'has_active_championship',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'is_active', 'foundation_date', 'created_at', 'updated_at']
    
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

            self._validate_ea_club_binding(data)

        if self.instance and ('ea_club_id' in data or 'ea_platform' in data):
            raise serializers.ValidationError(
                'O vínculo com a EA deve ser criado no cadastro inicial do time e não pode ser alterado por este endpoint.'
            )

        return data

    def _validate_ea_club_binding(self, data):
        errors = {}
        ea_club_id = str(data.get('ea_club_id') or '').strip()
        ea_platform = data.get('ea_platform')

        if not ea_club_id:
            errors['ea_club_id'] = 'Valide o time na API antes de concluir o cadastro.'

        if not ea_platform:
            errors['ea_platform'] = 'A plataforma validada na API é obrigatória.'

        if errors:
            raise serializers.ValidationError(errors)

        if EAClub.objects.filter(ea_club_id=ea_club_id, platform=ea_platform).exists():
            existing = EAClub.objects.select_related('team').filter(
                ea_club_id=ea_club_id,
                platform=ea_platform,
            ).first()
            team_name = existing.team.name if existing and existing.team_id else None
            detail = 'Este clube da EA já está vinculado a outro time.'
            if team_name:
                detail = f'Este clube da EA já está vinculado ao time "{team_name}".'
            raise serializers.ValidationError({'ea_club_id': detail})

        client = EAProClubsClient()
        try:
            payload = client.get_club_info(club_ids=ea_club_id, platform=ea_platform)
        except EAApiError:
            raise serializers.ValidationError({
                'ea_club_id': 'Não foi possível validar o time na API da EA agora. Tente novamente em instantes.'
            })

        official_club = self._extract_official_club(payload, ea_club_id)
        if not official_club:
            raise serializers.ValidationError({
                'ea_club_id': 'O time selecionado não foi localizado na API da EA. Revise os dados e valide novamente.'
            })

        self.context['validated_ea_club'] = {
            'ea_club_id': ea_club_id,
            'platform': ea_platform,
            'name': official_club.get('name') or official_club.get('clubName') or ea_club_id,
        }

    def _extract_official_club(self, payload, ea_club_id):
        club_key = str(ea_club_id)

        if isinstance(payload, dict):
            if club_key in payload and isinstance(payload[club_key], dict):
                return payload[club_key]
            if payload.get('clubId') == club_key or str(payload.get('clubId')) == club_key:
                return payload
            if payload.get('ea_club_id') == club_key:
                return payload

        if isinstance(payload, list):
            for item in payload:
                if not isinstance(item, dict):
                    continue
                if str(item.get('clubId')) == club_key or str(item.get('ea_club_id')) == club_key:
                    return item

        return None

    def create(self, validated_data):
        validated_data.pop('owner_id', None)
        validated_data.pop('ea_club_id', None)
        validated_data.pop('ea_platform', None)

        validated_ea_club = self.context.get('validated_ea_club')
        if not validated_ea_club:
            raise serializers.ValidationError('A validação do time na API é obrigatória antes do cadastro.')

        team = Team.objects.create(**validated_data)
        EAClub.objects.create(
            team=team,
            ea_club_id=validated_ea_club['ea_club_id'],
            platform=validated_ea_club['platform'],
            name=validated_ea_club['name'],
            is_active=True,
        )
        return team

    def get_lineup_visual_preferences(self, obj):
        return {**DEFAULT_LINEUP_STYLE, **(obj.lineup_visual_preferences or {})}


class TeamListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de times.
    """
    owner = UserSerializer(read_only=True)
    owner_name = serializers.CharField(source='owner.get_full_name', read_only=True)
    player_count = serializers.IntegerField(read_only=True)
    ea_club = TeamEAClubSerializer(read_only=True)
    lineup_visual_preferences = serializers.SerializerMethodField()
    
    class Meta:
        model = Team
        fields = [
            'id',
            'name',
            'abbreviation',
            'logo',
            'owner',
            'owner_name',
            'ea_club',
            'lineup_visual_preferences',
            'player_count',
            'is_active',
            'foundation_date'
        ]
        read_only_fields = ['id', 'is_active', 'foundation_date']

    def get_lineup_visual_preferences(self, obj):
        return {**DEFAULT_LINEUP_STYLE, **(obj.lineup_visual_preferences or {})}


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
    ea_club = TeamEAClubSerializer(read_only=True)
    lineup_visual_preferences = serializers.SerializerMethodField()
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
            'ea_club',
            'lineup_visual_preferences',
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

    def get_lineup_visual_preferences(self, obj):
        return {**DEFAULT_LINEUP_STYLE, **(obj.lineup_visual_preferences or {})}


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
