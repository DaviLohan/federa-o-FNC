from rest_framework import serializers
from django.utils import timezone
from .models import (
    Match, MatchReport, Goal, Assist, Card, Contestation,
    MatchProposal, MatchConfirmation,
    MatchLineup, MatchLineupPlayer,
)
from fnc_teams.serializers import TeamListSerializer, FormationSerializer
from fnc_championships.serializers import ChampionshipListSerializer
from users.serializers import UserSerializer, PlayerProfileListSerializer


class GoalSerializer(serializers.ModelSerializer):
    """
    Serializer para gols.
    """
    scorer = PlayerProfileListSerializer(read_only=True)
    scorer_id = serializers.IntegerField(write_only=True)
    team = TeamListSerializer(read_only=True)
    team_id = serializers.IntegerField(write_only=True)
    
    goal_type_display = serializers.CharField(source='get_goal_type_display', read_only=True)
    has_assist = serializers.SerializerMethodField()
    
    class Meta:
        model = Goal
        fields = [
            'id',
            'scorer',
            'scorer_id',
            'team',
            'team_id',
            'minute',
            'goal_type',
            'goal_type_display',
            'has_assist',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_has_assist(self, obj):
        """Verifica se o gol tem assistência."""
        return hasattr(obj, 'assist')
    
    def validate_minute(self, value):
        """Valida o minuto."""
        if not 1 <= value <= 120:
            raise serializers.ValidationError('Minuto deve estar entre 1 e 120.')
        return value


class AssistSerializer(serializers.ModelSerializer):
    """
    Serializer para assistências.
    """
    goal = GoalSerializer(read_only=True)
    goal_id = serializers.IntegerField(write_only=True)
    assistant = PlayerProfileListSerializer(read_only=True)
    assistant_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Assist
        fields = [
            'id',
            'goal',
            'goal_id',
            'assistant',
            'assistant_id',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def validate_goal_id(self, value):
        """Valida se o gol já não tem assistência."""
        if Assist.objects.filter(goal_id=value).exists():
            raise serializers.ValidationError('Este gol já possui uma assistência.')
        return value


class GoalWithAssistSerializer(serializers.ModelSerializer):
    """
    Serializer de gol com assistência aninhada.
    """
    scorer = PlayerProfileListSerializer(read_only=True)
    team = TeamListSerializer(read_only=True)
    assist = serializers.SerializerMethodField()
    goal_type_display = serializers.CharField(source='get_goal_type_display', read_only=True)
    
    class Meta:
        model = Goal
        fields = [
            'id',
            'scorer',
            'team',
            'minute',
            'goal_type',
            'goal_type_display',
            'assist'
        ]
    
    def get_assist(self, obj):
        """Retorna a assistência se existir."""
        if hasattr(obj, 'assist'):
            return {
                'assistant': PlayerProfileListSerializer(obj.assist.assistant).data
            }
        return None


class CardSerializer(serializers.ModelSerializer):
    """
    Serializer para cartões.
    """
    player = PlayerProfileListSerializer(read_only=True)
    player_id = serializers.IntegerField(write_only=True)
    team = TeamListSerializer(read_only=True)
    team_id = serializers.IntegerField(write_only=True)
    
    card_type_display = serializers.CharField(source='get_card_type_display', read_only=True)
    
    class Meta:
        model = Card
        fields = [
            'id',
            'player',
            'player_id',
            'team',
            'team_id',
            'card_type',
            'card_type_display',
            'minute',
            'reason',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def validate_minute(self, value):
        """Valida o minuto."""
        if not 1 <= value <= 120:
            raise serializers.ValidationError('Minuto deve estar entre 1 e 120.')
        return value


class MatchSerializer(serializers.ModelSerializer):
    """
    Serializer para partidas.
    """
    home_team = TeamListSerializer(read_only=True)
    home_team_id = serializers.IntegerField(write_only=True)
    away_team = TeamListSerializer(read_only=True)
    away_team_id = serializers.IntegerField(write_only=True)
    championship = ChampionshipListSerializer(read_only=True)
    championship_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    match_type_display = serializers.CharField(source='get_match_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Campos calculados
    winner = serializers.SerializerMethodField()
    is_draw = serializers.BooleanField(read_only=True)
    duration_minutes = serializers.IntegerField(read_only=True)
    can_start_now = serializers.SerializerMethodField()
    start_block_reason = serializers.SerializerMethodField()
    can_report = serializers.SerializerMethodField()
    
    class Meta:
        model = Match
        fields = [
            'id',
            'home_team',
            'home_team_id',
            'away_team',
            'away_team_id',
            'championship',
            'championship_id',
            'match_type',
            'match_type_display',
            'round_number',
            'scheduled_date',
            'started_at',
            'finished_at',
            'home_score',
            'away_score',
            'status',
            'status_display',
            'winner',
            'is_draw',
            'duration_minutes',
            'can_start_now',
            'start_block_reason',
            'can_report',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'started_at', 'finished_at', 'created_at', 'updated_at']
    
    def get_winner(self, obj):
        """Retorna o time vencedor."""
        winner = obj.winner
        if winner:
            return TeamListSerializer(winner).data
        return None

    def get_can_start_now(self, obj):
        return obj.can_start_manually()

    def get_start_block_reason(self, obj):
        return obj.get_start_block_reason()

    def get_can_report(self, obj):
        request = self.context.get('request')
        if not request or not getattr(request, 'user', None) or not request.user.is_authenticated:
            return False
        user = request.user
        if getattr(user, 'has_supervisor_access', False):
            return obj.status in [Match.Status.IN_PROGRESS, Match.Status.FINISHED, Match.Status.CONTESTED]
        is_owner = obj.home_team.owner_id == user.id or obj.away_team.owner_id == user.id
        return is_owner and obj.status in [Match.Status.IN_PROGRESS, Match.Status.FINISHED, Match.Status.CONTESTED]
    
    def validate(self, data):
        """Validações da partida."""
        home_team = data.get('home_team_id')
        away_team = data.get('away_team_id')
        
        if home_team == away_team:
            raise serializers.ValidationError('Times da casa e visitante devem ser diferentes.')
        
        return data


class MatchListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de partidas.
    """
    home_team = TeamListSerializer(read_only=True)
    away_team = TeamListSerializer(read_only=True)
    championship_name = serializers.CharField(source='championship.name', read_only=True, allow_null=True)
    
    match_type_display = serializers.CharField(source='get_match_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    can_start_now = serializers.SerializerMethodField()
    
    class Meta:
        model = Match
        fields = [
            'id',
            'home_team',
            'away_team',
            'home_score',
            'away_score',
            'championship_name',
            'match_type',
            'match_type_display',
            'status',
            'status_display',
            'scheduled_date',
            'can_start_now'
        ]

    def get_can_start_now(self, obj):
        return obj.can_start_manually()


class MatchReportSerializer(serializers.ModelSerializer):
    """
    Serializer para súmulas.
    """
    match = MatchListSerializer(read_only=True)
    match_id = serializers.IntegerField(write_only=True)
    home_score = serializers.IntegerField(write_only=True, min_value=0, required=False)
    away_score = serializers.IntegerField(write_only=True, min_value=0, required=False)
    reported_by = UserSerializer(read_only=True)
    approved_by = UserSerializer(read_only=True)
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = MatchReport
        fields = [
            'id',
            'match',
            'match_id',
            'home_score',
            'away_score',
            'reported_by',
            'screenshot',
            'notes',
            'status',
            'status_display',
            'approved_by',
            'approved_at',
            'rejection_reason',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'reported_by',
            'approved_by',
            'approved_at',
            'created_at',
            'updated_at'
        ]
    
    def validate_match_id(self, value):
        """Valida se a partida já não tem súmula."""
        if self.instance is None:  # Apenas na criação
            if MatchReport.objects.filter(match_id=value).exists():
                raise serializers.ValidationError('Esta partida já possui uma súmula.')
        return value

    def create(self, validated_data):
        validated_data.pop('home_score', None)
        validated_data.pop('away_score', None)
        match_id = validated_data.pop('match_id')
        validated_data.setdefault('status', MatchReport.Status.SUBMITTED)
        return MatchReport.objects.create(match_id=match_id, **validated_data)


class ContestationSerializer(serializers.ModelSerializer):
    """
    Serializer para contestações.
    """
    match = MatchListSerializer(read_only=True)
    match_id = serializers.IntegerField(write_only=True)
    team = TeamListSerializer(read_only=True)
    team_id = serializers.IntegerField(write_only=True)
    contested_by = UserSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)
    
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Contestation
        fields = [
            'id',
            'match',
            'match_id',
            'team',
            'team_id',
            'contested_by',
            'reason',
            'reason_display',
            'description',
            'evidence',
            'status',
            'status_display',
            'response',
            'reviewed_by',
            'reviewed_at',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'contested_by',
            'reviewed_by',
            'reviewed_at',
            'created_at',
            'updated_at'
        ]


class MatchDetailSerializer(serializers.ModelSerializer):
    """
    Serializer detalhado da partida com eventos.
    """
    home_team = TeamListSerializer(read_only=True)
    away_team = TeamListSerializer(read_only=True)
    championship = ChampionshipListSerializer(read_only=True)
    home_formation = FormationSerializer(read_only=True)
    away_formation = FormationSerializer(read_only=True)
    
    # Eventos da partida
    goals = GoalWithAssistSerializer(many=True, read_only=True)
    cards = CardSerializer(many=True, read_only=True)
    report = MatchReportSerializer(read_only=True)
    contestations = ContestationSerializer(many=True, read_only=True)
    
    match_type_display = serializers.CharField(source='get_match_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    winner = serializers.SerializerMethodField()
    is_draw = serializers.BooleanField(read_only=True)
    duration_minutes = serializers.IntegerField(read_only=True)
    can_start_now = serializers.SerializerMethodField()
    start_block_reason = serializers.SerializerMethodField()
    can_report = serializers.SerializerMethodField()
    
    class Meta:
        model = Match
        fields = [
            'id',
            'home_team',
            'away_team',
            'championship',
            'match_type',
            'match_type_display',
            'round_number',
            'scheduled_date',
            'started_at',
            'finished_at',
            'home_score',
            'away_score',
            'status',
            'status_display',
            'can_start_now',
            'start_block_reason',
            'can_report',
            'home_formation',
            'away_formation',
            'winner',
            'is_draw',
            'duration_minutes',
            'goals',
            'cards',
            'report',
            'contestations',
            'created_at',
            'updated_at'
        ]
    
    def get_winner(self, obj):
        """Retorna o time vencedor."""
        winner = obj.winner
        if winner:
            return TeamListSerializer(winner).data
        return None

    def get_can_start_now(self, obj):
        return obj.can_start_manually()

    def get_start_block_reason(self, obj):
        return obj.get_start_block_reason()

    def get_can_report(self, obj):
        request = self.context.get('request')
        if not request or not getattr(request, 'user', None) or not request.user.is_authenticated:
            return False
        user = request.user
        if getattr(user, 'has_supervisor_access', False):
            return obj.status in [Match.Status.IN_PROGRESS, Match.Status.FINISHED, Match.Status.CONTESTED]
        is_owner = obj.home_team.owner_id == user.id or obj.away_team.owner_id == user.id
        return is_owner and obj.status in [Match.Status.IN_PROGRESS, Match.Status.FINISHED, Match.Status.CONTESTED]


class MatchCreateSerializer(serializers.ModelSerializer):
    """
    Serializer para criar partida com eventos.
    """
    home_team = serializers.PrimaryKeyRelatedField(queryset=Match._meta.get_field('home_team').remote_field.model.objects.all())
    away_team = serializers.PrimaryKeyRelatedField(queryset=Match._meta.get_field('away_team').remote_field.model.objects.all())
    championship = serializers.PrimaryKeyRelatedField(
        queryset=Match._meta.get_field('championship').remote_field.model.objects.all(),
        required=False,
        allow_null=True,
    )
    goals = GoalSerializer(many=True, required=False)
    cards = CardSerializer(many=True, required=False)
    
    class Meta:
        model = Match
        fields = [
            'home_team',
            'away_team',
            'championship',
            'match_type',
            'round_number',
            'scheduled_date',
            'home_score',
            'away_score',
            'home_formation_id',
            'away_formation_id',
            'goals',
            'cards'
        ]
    
    def create(self, validated_data):
        """Cria a partida com eventos."""
        goals_data = validated_data.pop('goals', [])
        cards_data = validated_data.pop('cards', [])
        
        match = Match.objects.create(**validated_data)
        
        # Cria os gols
        for goal_data in goals_data:
            Goal.objects.create(match=match, **goal_data)
        
        # Cria os cartões
        for card_data in cards_data:
            Card.objects.create(match=match, **card_data)
        
        return match


class MatchProposalSerializer(serializers.ModelSerializer):
    """
    Serializer para propostas de data de partida.
    """
    proposed_by_team_name = serializers.CharField(source='proposed_by_team.name', read_only=True)
    match_details = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = MatchProposal
        fields = [
            'id',
            'match',
            'match_details',
            'proposed_by_team',
            'proposed_by_team_name',
            'proposed_date',
            'status',
            'response_message',
            'responded_by',
            'responded_at',
            'expires_at',
            'is_expired',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'status',
            'responded_by',
            'responded_at',
            'created_at',
            'updated_at'
        ]
    
    def get_match_details(self, obj):
        """Retorna detalhes básicos da partida."""
        return {
            'id': obj.match.id,
            'home_team': obj.match.home_team.name,
            'away_team': obj.match.away_team.name,
            'championship': obj.match.championship.name if obj.match.championship else None,
            'current_date': obj.match.scheduled_date
        }
    
    def validate_proposed_date(self, value):
        """Valida se a data proposta está no futuro."""
        if value <= timezone.now():
            raise serializers.ValidationError('A data proposta deve estar no futuro.')
        return value
    
    def validate(self, attrs):
        """Validações adicionais."""
        match = attrs.get('match')
        proposed_by_team = attrs.get('proposed_by_team')
        
        # Verificar se o time faz parte da partida
        if match and proposed_by_team:
            if proposed_by_team not in [match.home_team, match.away_team]:
                raise serializers.ValidationError('Apenas times participantes podem propor datas.')
        
        # Verificar se a partida já foi realizada
        if match and match.status != Match.Status.SCHEDULED:
            raise serializers.ValidationError('Só é possível propor datas para partidas agendadas.')
        
        # Validar data está dentro do período do campeonato
        if match and match.championship:
            proposed_date = attrs.get('proposed_date')
            if proposed_date:
                if proposed_date < match.championship.start_date:
                    raise serializers.ValidationError(
                        f'A data proposta deve ser após o início do campeonato ({match.championship.start_date.strftime("%d/%m/%Y")}).'
                    )
                if proposed_date > match.championship.end_date:
                    raise serializers.ValidationError(
                        f'A data proposta deve ser antes do fim do campeonato ({match.championship.end_date.strftime("%d/%m/%Y")}).'
                    )
        
        return attrs
    
    def create(self, validated_data):
        """Cria proposta com data de expiração automática (24h)."""
        from datetime import timedelta
        
        # Definir data de expiração (24h padrão)
        validated_data['expires_at'] = validated_data['proposed_date'] - timedelta(hours=24)
        
        return super().create(validated_data)


class MatchProposalResponseSerializer(serializers.Serializer):
    """
    Serializer para responder a uma proposta de data.
    """
    action = serializers.ChoiceField(choices=['accept', 'reject'])
    response_message = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        """Validações."""
        action = attrs.get('action')
        response_message = attrs.get('response_message', '')
        
        # Se rejeitar, exigir motivo
        if action == 'reject' and not response_message:
            raise serializers.ValidationError({
                'response_message': 'É obrigatório informar o motivo da rejeição.'
            })
        
        return attrs


class MatchConfirmationSerializer(serializers.ModelSerializer):
    """
    Serializer para confirmação de presença em partida.
    """
    team_name = serializers.CharField(source='team.name', read_only=True)
    match_details = serializers.SerializerMethodField()
    confirmed_by_name = serializers.CharField(source='confirmed_by.get_full_name', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = MatchConfirmation
        fields = [
            'id',
            'match',
            'match_details',
            'team',
            'team_name',
            'status',
            'confirmed_by',
            'confirmed_by_name',
            'confirmed_at',
            'decline_reason',
            'confirmation_deadline',
            'is_overdue',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'confirmed_by',
            'confirmed_at',
            'created_at',
            'updated_at'
        ]
    
    def get_match_details(self, obj):
        """Retorna detalhes da partida."""
        return {
            'id': obj.match.id,
            'home_team': obj.match.home_team.name,
            'away_team': obj.match.away_team.name,
            'scheduled_date': obj.match.scheduled_date,
            'championship': obj.match.championship.name if obj.match.championship else None
        }
    
    def validate(self, attrs):
        """Validações."""
        match = attrs.get('match')
        team = attrs.get('team')
        
        # Verificar se o time faz parte da partida
        if match and team:
            if team not in [match.home_team, match.away_team]:
                raise serializers.ValidationError('O time não participa desta partida.')
        
        # Verificar se a partida ainda está agendada
        if match and match.status != Match.Status.SCHEDULED:
            raise serializers.ValidationError('Só é possível confirmar presença em partidas agendadas.')
        
        return attrs


class MatchConfirmationUpdateSerializer(serializers.Serializer):
    """
    Serializer para atualizar status de confirmação.
    """
    status = serializers.ChoiceField(choices=['confirmed', 'declined'])
    decline_reason = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, attrs):
        """Validações."""
        status = attrs.get('status')
        decline_reason = attrs.get('decline_reason', '')
        
        # Se recusar, exigir motivo
        if status == 'declined' and not decline_reason:
            raise serializers.ValidationError({
                'decline_reason': 'É obrigatório informar o motivo da recusa.'
            })
        
        return attrs


        return attrs


# ---------------------------------------------------------------------------
# Serializers de Escalação de Partida (MatchLineup)
# ---------------------------------------------------------------------------

class MatchLineupPlayerInputSerializer(serializers.Serializer):
    """
    Entrada de um único jogador no payload de criação de escalação.
    Recebe o ID do PlayerProfile, a posição e as coordenadas visuais.
    """
    player_id  = serializers.IntegerField()
    position   = serializers.CharField(max_length=10)
    x_position = serializers.FloatField(min_value=0.0, max_value=100.0)
    y_position = serializers.FloatField(min_value=0.0, max_value=100.0)


class MatchLineupInputSerializer(serializers.Serializer):
    """
    Payload completo do POST /api/v1/matches/<match_id>/lineup/.
    
    Valida:
    - Formação deve ser uma das 7 disponíveis no TacticalBoard.
    - Exatamente 11 jogadores devem ser informados.
    - Nenhum player_id pode se repetir.
    """
    VALID_FORMATIONS = ['4-3-3', '4-2-3-1', '4-4-2', '5-3-2', '4-3-2-1', '4-1-2-1-2', '4-3-3(4)']

    formation = serializers.ChoiceField(choices=[(f, f) for f in VALID_FORMATIONS])
    players   = MatchLineupPlayerInputSerializer(many=True)

    def validate_players(self, value):
        """Garante exatamente 11 jogadores sem repetições."""
        if len(value) != 11:
            raise serializers.ValidationError(
                f'A escalação deve conter exatamente 11 jogadores. Recebido: {len(value)}.'
            )
        ids = [p['player_id'] for p in value]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError(
                'O mesmo jogador não pode ser escalado em duas posições.'
            )
        return value


class MatchLineupPlayerOutputSerializer(serializers.ModelSerializer):
    """
    Serializer de saída de um jogador na escalação — expande o PlayerProfile.
    """
    player = PlayerProfileListSerializer(read_only=True)

    class Meta:
        model  = MatchLineupPlayer
        fields = ['player', 'position', 'x_position', 'y_position']


class MatchLineupOutputSerializer(serializers.ModelSerializer):
    """
    Serializer de saída completo da escalação — retornado após POST/GET.
    """
    team         = TeamListSerializer(read_only=True)
    submitted_by = UserSerializer(read_only=True)
    players      = MatchLineupPlayerOutputSerializer(many=True, read_only=True)

    class Meta:
        model  = MatchLineup
        fields = [
            'id', 'match', 'team', 'formation',
            'submitted_by', 'players', 'created_at', 'updated_at',
        ]
