from rest_framework import serializers
from django.db.models import F
from django.core.exceptions import ObjectDoesNotExist
import json
from .models import Championship, ChampionshipEnrollment, ChampionshipPrize, Bracket, Standings, Group, GroupStandings
from users.serializers import UserSerializer
from fnc_teams.serializers import TeamListSerializer


class ChampionshipSerializer(serializers.ModelSerializer):
    """
    Serializer para campeonatos.
    """
    created_by = UserSerializer(read_only=True)
    
    championship_type_display = serializers.CharField(
        source='get_championship_type_display',
        read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Campos calculados
    is_enrollment_open = serializers.BooleanField(read_only=True)
    enrolled_teams_count = serializers.IntegerField(read_only=True)

    # Campos de imagem declarados explicitamente para garantir required=False
    # em PUT/PATCH (sem isso, DRF pode exigir o campo em updates completos)
    banner = serializers.ImageField(required=False, allow_null=True)
    logo = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = Championship
        fields = [
            'id',
            'name',
            'description',
            'rules',
            'championship_type',
            'championship_type_display',
            'banner',
            'logo',
            'enrollment_start',
            'enrollment_end',
            'start_date',
            'end_date',
            'enrollment_fee',
            'prize_pool',
            'max_teams',
            'min_teams',
            'number_of_winners',
            'num_groups',
            'teams_per_group',
            'qualified_per_group',
            'group_stage_format',
            'has_third_place_match',
            'tiebreak_criteria',
            'current_phase',
            'game_days',
            'game_start_time',
            'game_end_time',
            'status',
            'status_display',
            'created_by',
            'is_enrollment_open',
            'enrolled_teams_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'status',
            'status_display',
            'created_by',
            'start_date',
            'end_date',
            'created_at',
            'updated_at',
        ]
    
    def validate_game_days(self, value):
        """Trata game_days que chega como string JSON via FormData (multipart)."""
        if isinstance(value, str):
            try:
                value = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                raise serializers.ValidationError('Formato inválido para dias de jogo.')
        if not isinstance(value, list):
            raise serializers.ValidationError('Deve ser uma lista de dias da semana.')
        return value
    
    def validate(self, data):
        """Validações customizadas."""
        championship_type = data.get('championship_type')
        if championship_type is None and self.instance is not None:
            championship_type = self.instance.championship_type

        # Valida datas de inscrição
        if data.get('enrollment_start') and data.get('enrollment_end'):
            if data['enrollment_start'] >= data['enrollment_end']:
                raise serializers.ValidationError({
                    'enrollment_end': 'Data de término deve ser posterior ao início.'
                })
        
        # Valida número de times
        max_teams = data.get('max_teams')
        min_teams = data.get('min_teams', 4)
        if max_teams and max_teams < min_teams:
            raise serializers.ValidationError({
                'max_teams': 'Máximo de times deve ser maior que o mínimo.'
            })
        
        # Validações específicas para GROUPS_KNOCKOUT
        if championship_type == 'GROUPS_KNOCKOUT':
            num_groups = data.get('num_groups')
            if num_groups is None and self.instance is not None:
                num_groups = self.instance.num_groups
            if not num_groups:
                raise serializers.ValidationError({
                    'num_groups': 'Campo obrigatório para campeonatos Grupos + Mata-Mata.'
                })
            
            teams_per_group = data.get('teams_per_group', 4)
            if 'teams_per_group' not in data and self.instance is not None:
                teams_per_group = self.instance.teams_per_group or teams_per_group
            expected_teams = num_groups * teams_per_group
            
            if data.get('max_teams') and data['max_teams'] != expected_teams:
                raise serializers.ValidationError({
                    'max_teams': f'Para {num_groups} grupos com {teams_per_group} times cada, o total deve ser {expected_teams} times.'
                })
            
            # Auto-define max_teams se não fornecido
            if not data.get('max_teams'):
                data['max_teams'] = expected_teams
            
            # Define critérios de desempate padrão
            if not data.get('tiebreak_criteria'):
                data['tiebreak_criteria'] = ['wins', 'goal_diff', 'goals_for']
            
            # Define fase inicial
            if not data.get('current_phase'):
                data['current_phase'] = 'GROUPS'
            if not data.get('group_stage_format'):
                data['group_stage_format'] = Championship.GroupStageFormat.SINGLE_ROUND
        elif 'group_stage_format' in data and not data['group_stage_format']:
            data['group_stage_format'] = Championship.GroupStageFormat.SINGLE_ROUND
        
        # Valida dias de jogo
        game_days = data.get('game_days')
        if game_days:
            valid_days = Championship.VALID_GAME_DAYS
            if not isinstance(game_days, list):
                raise serializers.ValidationError({
                    'game_days': 'Deve ser uma lista de dias da semana.'
                })
            for day in game_days:
                if day not in valid_days:
                    raise serializers.ValidationError({
                        'game_days': f'Dia inválido: {day}. Use: {", ".join(valid_days)}'
                    })
        
        # Valida horários de jogo
        game_start = data.get('game_start_time')
        game_end = data.get('game_end_time')
        if game_start and game_end:
            if game_start >= game_end:
                raise serializers.ValidationError({
                    'game_end_time': 'Horário de término deve ser posterior ao de início.'
                })
        elif game_start and not game_end:
            raise serializers.ValidationError({
                'game_end_time': 'Informe também o horário de término.'
            })
        elif game_end and not game_start:
            raise serializers.ValidationError({
                'game_start_time': 'Informe também o horário de início.'
            })
        
        return data


class ChampionshipListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de campeonatos.
    """
    championship_type_display = serializers.CharField(
        source='get_championship_type_display',
        read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    enrolled_teams_count = serializers.IntegerField(read_only=True)
    is_enrollment_open = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Championship
        fields = [
            'id',
            'name',
            'banner',
            'logo',
            'championship_type',
            'championship_type_display',
            'status',
            'status_display',
            'enrollment_start',
            'enrollment_end',
            'start_date',
            'prize_pool',
            'enrolled_teams_count',
            'max_teams',
            'is_enrollment_open',
            'game_days',
            'game_start_time',
            'game_end_time'
        ]


class ChampionshipEnrollmentSerializer(serializers.ModelSerializer):
    """
    Serializer para inscrições em campeonatos.
    """
    championship = ChampionshipListSerializer(read_only=True)
    championship_id = serializers.IntegerField(write_only=True)
    team = TeamListSerializer(read_only=True)
    team_id = serializers.IntegerField(write_only=True)
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = ChampionshipEnrollment
        fields = [
            'id',
            'championship',
            'championship_id',
            'team',
            'team_id',
            'status',
            'status_display',
            'payment_status',
            'payment_id',
            'payment',
            'enrolled_at',
            'approved_at'
        ]
        read_only_fields = [
            'id',
            'status',
            'payment_status',
            'payment_id',
            'payment',
            'enrolled_at',
            'approved_at',
        ]

    def get_payment(self, obj):
        try:
            payment = obj.payment
        except ObjectDoesNotExist:
            return None

        return {
            'id': payment.id,
            'status': payment.status,
            'pix_qr_code_text': payment.pix_qr_code_text,
            'pix_qr_code_base64': payment.pix_qr_code_base64,
            'ticket_url': payment.ticket_url,
            'expires_at': payment.expires_at,
            'paid_at': payment.paid_at,
        }
    
    def validate(self, data):
        """Validações de inscrição."""
        from fnc_teams.models import Team, TeamMembership
        
        championship_id = data.get('championship_id')
        team_id = data.get('team_id')
        request = self.context.get('request')
        
        # Verifica se já não está inscrito
        if ChampionshipEnrollment.objects.filter(
            championship_id=championship_id,
            team_id=team_id
        ).exists():
            raise serializers.ValidationError('Time já está inscrito neste campeonato.')
        
        # Valida o time
        try:
            team = Team.objects.get(id=team_id)

            if request and not request.user.has_supervisor_access and team.owner_id != request.user.id:
                raise serializers.ValidationError('Você só pode inscrever um time que pertença à sua conta.')
            
            # ✅ NOVA VALIDAÇÃO: Verifica se o time tem mínimo de 5 jogadores ativos
            active_players_count = TeamMembership.objects.filter(
                team=team,
                is_active=True
            ).count()
            
            if active_players_count < 5:
                raise serializers.ValidationError(
                    f'Time precisa ter no mínimo 5 jogadores ativos. '
                    f'Atualmente possui {active_players_count} jogador(es).'
                )
            
            # VALIDAÇÃO DE CONFLITO DE AGENDA: Permite múltiplos campeonatos
            # desde que não haja sobreposição de dias E horários
            active_enrollments = ChampionshipEnrollment.objects.filter(
                team=team,
                status='APPROVED',
                championship__status__in=['OPEN', 'IN_PROGRESS']
            ).exclude(championship_id=championship_id).select_related('championship')
            
            # Buscar o campeonato alvo para comparar agenda
            try:
                target_champ = Championship.objects.get(id=championship_id)
            except Championship.DoesNotExist:
                raise serializers.ValidationError('Campeonato não encontrado.')
            
            target_days = set(target_champ.game_days or [])
            target_start = target_champ.game_start_time
            target_end = target_champ.game_end_time
            
            # Só verifica conflito se o campeonato alvo tem agenda definida
            if target_days and target_start and target_end:
                for enrollment in active_enrollments:
                    other = enrollment.championship
                    other_days = set(other.game_days or [])
                    other_start = other.game_start_time
                    other_end = other.game_end_time
                    
                    # Se o outro campeonato não tem agenda, não há conflito detectável
                    if not other_days or not other_start or not other_end:
                        continue
                    
                    # Verifica sobreposição de dias
                    overlapping_days = target_days & other_days
                    if not overlapping_days:
                        continue
                    
                    # Verifica sobreposição de horários
                    # Conflito: start_A < end_B AND start_B < end_A
                    if target_start < other_end and other_start < target_end:
                        day_names = {
                            'MON': 'Segunda', 'TUE': 'Terça', 'WED': 'Quarta',
                            'THU': 'Quinta', 'FRI': 'Sexta', 'SAT': 'Sábado', 'SUN': 'Domingo'
                        }
                        sorted_days = sorted(overlapping_days)
                        conflict_days_str = ', '.join(
                            str(day_names.get(d, d)) for d in sorted_days
                        )
                        raise serializers.ValidationError(
                            f'Conflito de agenda com o campeonato "{other.name}". '
                            f'Dias em comum: {conflict_days_str}, '
                            f'horários sobrepostos: '
                            f'{other_start.strftime("%H:%M")}-{other_end.strftime("%H:%M")} '
                            f'vs {target_start.strftime("%H:%M")}-{target_end.strftime("%H:%M")}.'
                        )
        except Team.DoesNotExist:
            raise serializers.ValidationError('Time não encontrado.')
        
        # Verifica o campeonato
        try:
            championship = Championship.objects.get(id=championship_id)
            
            # Verifica se as inscrições estão abertas
            if not championship.is_enrollment_open:
                raise serializers.ValidationError('Inscrições não estão abertas para este campeonato.')
            
            # ✅ MELHORADA: Verifica se atingiu o máximo de times
            if championship.max_teams:
                # Conta apenas inscrições aprovadas ou pendentes
                current_enrollments = ChampionshipEnrollment.objects.filter(
                    championship=championship,
                    status__in=['PENDING_PAYMENT', 'APPROVED']
                ).count()
                
                if current_enrollments >= championship.max_teams:
                    raise serializers.ValidationError(
                        f'Campeonato já atingiu o número máximo de times ({championship.max_teams}).'
                    )
        except Championship.DoesNotExist:
            raise serializers.ValidationError('Campeonato não encontrado.')
        
        return data


class ChampionshipPrizeSerializer(serializers.ModelSerializer):
    """
    Serializer para premiações.
    """
    championship = ChampionshipListSerializer(read_only=True)
    championship_id = serializers.IntegerField(write_only=True)
    winner_team = TeamListSerializer(read_only=True)
    winner_team_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = ChampionshipPrize
        fields = [
            'id',
            'championship',
            'championship_id',
            'position',
            'amount',
            'description',
            'winner_team',
            'winner_team_id'
        ]
    
    def validate_position(self, value):
        """Valida a posição."""
        if value < 1:
            raise serializers.ValidationError('Posição deve ser maior que 0.')
        return value
    
    def validate_amount(self, value):
        """Valida o valor."""
        if value < 0:
            raise serializers.ValidationError('Valor deve ser maior ou igual a zero.')
        return value


class BracketSerializer(serializers.ModelSerializer):
    """
    Serializer para chaveamento.
    """
    championship = ChampionshipListSerializer(read_only=True)
    championship_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Bracket
        fields = [
            'id',
            'championship',
            'championship_id',
            'structure',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_structure(self, value):
        """Valida se a estrutura é um JSON válido."""
        if not isinstance(value, (dict, list)):
            raise serializers.ValidationError('Estrutura deve ser um objeto JSON válido.')
        return value


class StandingsSerializer(serializers.ModelSerializer):
    """
    Serializer para classificação.
    """
    championship = ChampionshipListSerializer(read_only=True)
    championship_id = serializers.IntegerField(write_only=True)
    team = TeamListSerializer(read_only=True)
    team_id = serializers.IntegerField(write_only=True)
    
    # Campos calculados
    goal_difference = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Standings
        fields = [
            'id',
            'championship',
            'championship_id',
            'team',
            'team_id',
            'matches_played',
            'wins',
            'draws',
            'losses',
            'goals_for',
            'goals_against',
            'goal_difference',
            'points',
            'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']


class ChampionshipDetailSerializer(serializers.ModelSerializer):
    """
    Serializer detalhado do campeonato com inscrições e premiações.
    """
    created_by = UserSerializer(read_only=True)
    enrollments = serializers.SerializerMethodField()
    prizes = ChampionshipPrizeSerializer(many=True, read_only=True)
    standings = serializers.SerializerMethodField()
    bracket = BracketSerializer(read_only=True)
    
    championship_type_display = serializers.CharField(
        source='get_championship_type_display',
        read_only=True
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_enrollment_open = serializers.BooleanField(read_only=True)
    enrolled_teams_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Championship
        fields = [
            'id',
            'name',
            'description',
            'rules',
            'championship_type',
            'championship_type_display',
            'banner',
            'logo',
            'enrollment_start',
            'enrollment_end',
            'start_date',
            'end_date',
            'enrollment_fee',
            'prize_pool',
            'max_teams',
            'min_teams',
            'number_of_winners',
            'num_groups',
            'teams_per_group',
            'qualified_per_group',
            'group_stage_format',
            'has_third_place_match',
            'tiebreak_criteria',
            'current_phase',
            'game_days',
            'game_start_time',
            'game_end_time',
            'status',
            'status_display',
            'created_by',
            'is_enrollment_open',
            'enrolled_teams_count',
            'enrollments',
            'prizes',
            'standings',
            'bracket',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def get_enrollments(self, obj):
        """Retorna inscrições aprovadas."""
        enrollments = getattr(obj, 'prefetched_approved_enrollments', None)
        if enrollments is None:
            enrollments = obj.enrollments.filter(status='APPROVED').select_related('team')
        return ChampionshipEnrollmentSerializer(enrollments, many=True).data
    
    def get_standings(self, obj):
        """Retorna classificação se for pontos corridos."""
        if obj.championship_type == 'LEAGUE':
            standings = obj.standings.all().select_related('team').annotate(
                goal_difference_order=F('goals_for') - F('goals_against')
            ).order_by('-points', '-goal_difference_order', '-goals_for', 'team__name')
            return StandingsSerializer(standings, many=True).data
        return None


class GroupSerializer(serializers.ModelSerializer):
    """
    Serializer para grupos.
    """
    class Meta:
        model = Group
        fields = [
            'id',
            'championship',
            'name',
            'order',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class GroupStandingsSerializer(serializers.ModelSerializer):
    """
    Serializer para classificação de grupos.
    """
    team = TeamListSerializer(read_only=True)
    team_id = serializers.IntegerField(write_only=True)
    goal_difference = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = GroupStandings
        fields = [
            'id',
            'group',
            'team',
            'team_id',
            'matches_played',
            'wins',
            'draws',
            'losses',
            'goals_for',
            'goals_against',
            'goal_difference',
            'points',
            'position',
            'qualified',
            'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']
