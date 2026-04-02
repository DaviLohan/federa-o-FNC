"""
ea_integration/serializers.py

Serializers DRF para os models da integração EA Pro Clubs.
"""

from rest_framework import serializers

from .models import EAClub, EAMatch, EAPlayerMatchStats


# ─── EAClub ────────────────────────────────────────────────────────────────────

class EAClubSerializer(serializers.ModelSerializer):
    """Serializer completo do EAClub."""

    team_name = serializers.CharField(source='team.name', read_only=True, default=None)
    platform_display = serializers.CharField(source='get_platform_display', read_only=True)

    class Meta:
        model = EAClub
        fields = [
            'id',
            'ea_club_id',
            'platform',
            'platform_display',
            'name',
            'team',
            'team_name',
            'is_active',
            'last_synced_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'last_synced_at']


class EAClubCreateSerializer(serializers.ModelSerializer):
    """Serializer para criar/vincular um EAClub."""

    class Meta:
        model = EAClub
        fields = [
            'ea_club_id',
            'platform',
            'name',
            'team',
            'is_active',
        ]

    def validate(self, attrs):
        """Verifica duplicidade de ea_club_id + platform."""
        ea_club_id = attrs.get('ea_club_id')
        platform = attrs.get('platform')

        if EAClub.objects.filter(ea_club_id=ea_club_id, platform=platform).exists():
            raise serializers.ValidationError(
                'Já existe um clube cadastrado com este ID e plataforma.'
            )
        return attrs


# ─── EAPlayerMatchStats ────────────────────────────────────────────────────────

class EAPlayerMatchStatsSerializer(serializers.ModelSerializer):
    """Serializer para stats individuais de jogador em uma partida EA."""

    pass_accuracy = serializers.FloatField(read_only=True)
    tackle_accuracy = serializers.FloatField(read_only=True)
    minutes_played = serializers.IntegerField(read_only=True)

    class Meta:
        model = EAPlayerMatchStats
        fields = [
            'id',
            'player_name',
            'position',
            'rating',
            'goals',
            'assists',
            'passes_made',
            'pass_attempts',
            'pass_accuracy',
            'shots',
            'tackles_made',
            'tackle_attempts',
            'tackle_accuracy',
            'saves',
            'red_cards',
            'seconds_played',
            'minutes_played',
            'wins',
            'losses',
        ]


# ─── EAMatch ──────────────────────────────────────────────────────────────────

class EAMatchListSerializer(serializers.ModelSerializer):
    """Serializer resumido para listagem de partidas EA."""

    match_type_display = serializers.CharField(source='get_match_type_display', read_only=True)
    home_club_info = EAClubSerializer(source='home_club', read_only=True)
    away_club_info = EAClubSerializer(source='away_club', read_only=True)

    class Meta:
        model = EAMatch
        fields = [
            'id',
            'ea_match_id',
            'match_type',
            'match_type_display',
            'played_at',
            'home_club_info',
            'home_club_name',
            'home_score',
            'away_club_info',
            'away_club_name',
            'away_score',
            'created_at',
        ]


class EAMatchDetailSerializer(serializers.ModelSerializer):
    """Serializer detalhado com stats dos jogadores incluídos."""

    match_type_display = serializers.CharField(source='get_match_type_display', read_only=True)
    home_club_info = EAClubSerializer(source='home_club', read_only=True)
    away_club_info = EAClubSerializer(source='away_club', read_only=True)
    home_players = serializers.SerializerMethodField()
    away_players = serializers.SerializerMethodField()

    class Meta:
        model = EAMatch
        fields = [
            'id',
            'ea_match_id',
            'match_type',
            'match_type_display',
            'played_at',
            'home_club_info',
            'home_club_name',
            'home_score',
            'away_club_info',
            'away_club_name',
            'away_score',
            'home_players',
            'away_players',
            'created_at',
        ]

    def get_home_players(self, obj):
        stats = obj.player_stats.filter(ea_club=obj.home_club).order_by('-rating')
        return EAPlayerMatchStatsSerializer(stats, many=True).data

    def get_away_players(self, obj):
        stats = obj.player_stats.filter(ea_club=obj.away_club).order_by('-rating')
        return EAPlayerMatchStatsSerializer(stats, many=True).data


# ─── Busca de clube na EA (não é model serializer) ─────────────────────────────

class EAClubSearchSerializer(serializers.Serializer):
    """Serializer para parâmetros de busca de clube na EA."""

    club_name = serializers.CharField(
        required=True,
        min_length=2,
        max_length=100,
        help_text='Nome do clube para buscar na API da EA',
    )
    platform = serializers.ChoiceField(
        choices=EAClub.Platform.choices,
        default='common-gen5',
        help_text='Plataforma (common-gen5, common-gen4, pc)',
    )


class SyncResultSerializer(serializers.Serializer):
    """Serializer para o resultado de uma sincronização."""

    synced = serializers.IntegerField()
    skipped = serializers.IntegerField()
    errors = serializers.IntegerField()
    clubs_processed = serializers.IntegerField(required=False)


# ─── EA Report (Reportar Partida via EA API) ──────────────────────────────────

class EAReportMatchedPlayerSerializer(serializers.Serializer):
    """Jogador interno vinculado a um gamertag EA."""
    id = serializers.IntegerField()
    player_name = serializers.CharField()
    gamer_tag = serializers.CharField(allow_null=True)


class EAReportPlayerSerializer(serializers.Serializer):
    """Jogador na partida EA com dados de stats e match com roster interno."""
    gamertag = serializers.CharField()
    position = serializers.CharField()
    rating = serializers.CharField()
    goals = serializers.IntegerField()
    assists = serializers.IntegerField()
    red_cards = serializers.IntegerField()
    saves = serializers.IntegerField()
    passes_made = serializers.IntegerField()
    pass_attempts = serializers.IntegerField()
    shots = serializers.IntegerField()
    tackles_made = serializers.IntegerField()
    tackle_attempts = serializers.IntegerField()
    seconds_played = serializers.IntegerField()
    is_disconnected = serializers.BooleanField()
    matched_player = EAReportMatchedPlayerSerializer(allow_null=True)


class EAReportTeamSerializer(serializers.Serializer):
    """Time na preview do report EA."""
    team_id = serializers.IntegerField()
    team_name = serializers.CharField()
    ea_club_name = serializers.CharField()
    score = serializers.IntegerField()
    players = EAReportPlayerSerializer(many=True)


class EAReportWarningSerializer(serializers.Serializer):
    """Warning de validação no report EA."""
    type = serializers.CharField()
    severity = serializers.CharField()
    message = serializers.CharField()


class EAReportPreviewSerializer(serializers.Serializer):
    """Preview completo do report EA para o frontend."""
    ea_match_id = serializers.IntegerField()
    ea_match_id_external = serializers.CharField()
    played_at = serializers.CharField()
    validation_status = serializers.CharField()
    home_team = EAReportTeamSerializer()
    away_team = EAReportTeamSerializer()
    warnings = EAReportWarningSerializer(many=True)
    can_confirm = serializers.BooleanField()


class EAReportConfirmSerializer(serializers.Serializer):
    """Input para confirmar um report EA."""
    ea_match_id = serializers.IntegerField(
        required=True,
        help_text='ID do EAMatch no banco (pk)',
    )


class EAReportContestSerializer(serializers.Serializer):
    """Input para contestar um report EA."""
    ea_match_id = serializers.IntegerField(
        required=True,
        help_text='ID do EAMatch no banco (pk)',
    )
    reason = serializers.ChoiceField(
        choices=[
            ('WRONG_SCORE', 'Placar Incorreto'),
            ('MISSING_PLAYER', 'Jogador Ausente na Súmula'),
            ('FAKE_SCREENSHOT', 'Screenshot Falso'),
            ('OPPONENT_QUIT', 'Adversário Saiu da Partida'),
            ('CONNECTION_ISSUE', 'Problema de Conexão'),
            ('OTHER', 'Outro Motivo'),
        ],
        required=True,
    )
    description = serializers.CharField(
        required=True,
        min_length=20,
        max_length=2000,
        help_text='Descrição detalhada do motivo da contestação (mín. 20 caracteres)',
    )
