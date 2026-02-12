from rest_framework import serializers
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
            'has_third_place_match',
            'tiebreak_criteria',
            'current_phase',
            'status',
            'status_display',
            'created_by',
            'is_enrollment_open',
            'enrolled_teams_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validações customizadas."""
        # Bloqueia criação de novos campeonatos KNOCKOUT
        if data.get('championship_type') == 'KNOCKOUT' and not self.instance:
            raise serializers.ValidationError({
                'championship_type': 'Não é permitido criar novos campeonatos Mata-Mata. Use "Grupos + Mata-Mata" para torneios eliminatórios.'
            })
        
        # Valida datas de inscrição
        if data.get('enrollment_start') and data.get('enrollment_end'):
            if data['enrollment_start'] >= data['enrollment_end']:
                raise serializers.ValidationError({
                    'enrollment_end': 'Data de término deve ser posterior ao início.'
                })
        
        # Valida datas do campeonato
        if data.get('start_date') and data.get('enrollment_end'):
            if data['start_date'] <= data['enrollment_end']:
                raise serializers.ValidationError({
                    'start_date': 'Campeonato deve iniciar após o período de inscrições.'
                })
        
        # Valida número de times
        max_teams = data.get('max_teams')
        min_teams = data.get('min_teams', 4)
        if max_teams and max_teams < min_teams:
            raise serializers.ValidationError({
                'max_teams': 'Máximo de times deve ser maior que o mínimo.'
            })
        
        # Validações específicas para GROUPS_KNOCKOUT
        if data.get('championship_type') == 'GROUPS_KNOCKOUT':
            num_groups = data.get('num_groups')
            if not num_groups:
                raise serializers.ValidationError({
                    'num_groups': 'Campo obrigatório para campeonatos Grupos + Mata-Mata.'
                })
            
            teams_per_group = data.get('teams_per_group', 4)
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
            'is_enrollment_open'
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
            'enrolled_at',
            'approved_at'
        ]
        read_only_fields = ['id', 'enrolled_at', 'approved_at', 'payment_id']
    
    def validate(self, data):
        """Validações de inscrição."""
        from fnc_teams.models import Team, TeamMembership
        
        championship_id = data.get('championship_id')
        team_id = data.get('team_id')
        
        # Verifica se já não está inscrito
        if ChampionshipEnrollment.objects.filter(
            championship_id=championship_id,
            team_id=team_id
        ).exists():
            raise serializers.ValidationError('Time já está inscrito neste campeonato.')
        
        # Valida o time
        try:
            team = Team.objects.get(id=team_id)
            
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
            
            # ✅ NOVA VALIDAÇÃO: Verifica se o time já está em outro campeonato ativo
            has_active_championship = ChampionshipEnrollment.objects.filter(
                team=team,
                status='APPROVED',
                championship__status__in=['OPEN', 'IN_PROGRESS']
            ).exclude(championship_id=championship_id).exists()
            
            if has_active_championship:
                raise serializers.ValidationError(
                    'Time já está inscrito em outro campeonato ativo. '
                    'Aguarde a conclusão do campeonato atual antes de se inscrever em outro.'
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
                    status__in=['PENDING', 'APPROVED']
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
            'has_third_place_match',
            'tiebreak_criteria',
            'current_phase',
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
        enrollments = obj.enrollments.filter(status='APPROVED').select_related('team')
        return ChampionshipEnrollmentSerializer(enrollments, many=True).data
    
    def get_standings(self, obj):
        """Retorna classificação se for pontos corridos."""
        if obj.championship_type == 'LEAGUE':
            standings = obj.standings.all().select_related('team').order_by('-points', '-wins', '-goals_for')
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
