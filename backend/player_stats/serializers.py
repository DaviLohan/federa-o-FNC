from rest_framework import serializers
from .models import PlayerStatistics, TeamStatistics, SeasonSummary, TopScorer
from users.serializers import PlayerProfileListSerializer
from fnc_teams.serializers import TeamListSerializer
from fnc_championships.serializers import ChampionshipListSerializer


class PlayerStatisticsSerializer(serializers.ModelSerializer):
    """
    Serializer para estatísticas de jogadores.
    """
    player = PlayerProfileListSerializer(read_only=True)
    player_id = serializers.IntegerField(write_only=True)
    championship = ChampionshipListSerializer(read_only=True)
    championship_id = serializers.IntegerField(write_only=True)
    team = TeamListSerializer(read_only=True)
    team_id = serializers.IntegerField(write_only=True)
    
    # Campos calculados
    goals_per_match = serializers.FloatField(read_only=True)
    assists_per_match = serializers.FloatField(read_only=True)
    goal_contributions = serializers.IntegerField(read_only=True)
    win_rate = serializers.FloatField(read_only=True)
    
    class Meta:
        model = PlayerStatistics
        fields = [
            'id',
            'player',
            'player_id',
            'championship',
            'championship_id',
            'team',
            'team_id',
            'matches_played',
            'matches_won',
            'matches_drawn',
            'matches_lost',
            'goals',
            'assists',
            'yellow_cards',
            'red_cards',
            'minutes_played',
            'clean_sheets',
            'average_rating',
            'goals_per_match',
            'assists_per_match',
            'goal_contributions',
            'win_rate',
            'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']
    
    def validate_average_rating(self, value):
        """Valida a nota média."""
        if not 0 <= value <= 10:
            raise serializers.ValidationError('Nota deve estar entre 0 e 10.')
        return value


class PlayerStatisticsListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de estatísticas.
    """
    player_name = serializers.CharField(source='player.player_name', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    championship_name = serializers.CharField(source='championship.name', read_only=True)
    
    goals_per_match = serializers.FloatField(read_only=True)
    win_rate = serializers.FloatField(read_only=True)
    
    class Meta:
        model = PlayerStatistics
        fields = [
            'id',
            'player_name',
            'team_name',
            'championship_name',
            'matches_played',
            'goals',
            'assists',
            'goals_per_match',
            'average_rating',
            'win_rate'
        ]


class TeamStatisticsSerializer(serializers.ModelSerializer):
    """
    Serializer para estatísticas de times.
    """
    team = TeamListSerializer(read_only=True)
    team_id = serializers.IntegerField(write_only=True)
    championship = ChampionshipListSerializer(read_only=True)
    championship_id = serializers.IntegerField(write_only=True)
    
    # Campos calculados
    goal_difference = serializers.IntegerField(read_only=True)
    points = serializers.IntegerField(read_only=True)
    win_rate = serializers.FloatField(read_only=True)
    goals_per_match = serializers.FloatField(read_only=True)
    goals_conceded_per_match = serializers.FloatField(read_only=True)
    clean_sheet_rate = serializers.FloatField(read_only=True)
    
    class Meta:
        model = TeamStatistics
        fields = [
            'id',
            'team',
            'team_id',
            'championship',
            'championship_id',
            'matches_played',
            'matches_won',
            'matches_drawn',
            'matches_lost',
            'goals_scored',
            'goals_conceded',
            'yellow_cards',
            'red_cards',
            'clean_sheets',
            'biggest_win_margin',
            'biggest_loss_margin',
            'current_win_streak',
            'longest_win_streak',
            'current_unbeaten_streak',
            'longest_unbeaten_streak',
            'goal_difference',
            'points',
            'win_rate',
            'goals_per_match',
            'goals_conceded_per_match',
            'clean_sheet_rate',
            'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']


class TeamStatisticsListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de estatísticas de times.
    """
    team_name = serializers.CharField(source='team.name', read_only=True)
    championship_name = serializers.CharField(source='championship.name', read_only=True)
    
    goal_difference = serializers.IntegerField(read_only=True)
    points = serializers.IntegerField(read_only=True)
    win_rate = serializers.FloatField(read_only=True)
    
    class Meta:
        model = TeamStatistics
        fields = [
            'id',
            'team_name',
            'championship_name',
            'matches_played',
            'matches_won',
            'matches_drawn',
            'matches_lost',
            'goals_scored',
            'goals_conceded',
            'goal_difference',
            'points',
            'win_rate'
        ]


class SeasonSummarySerializer(serializers.ModelSerializer):
    """
    Serializer para resumo da temporada.
    """
    player = PlayerProfileListSerializer(read_only=True)
    player_id = serializers.IntegerField(write_only=True)
    
    # Campos calculados
    win_rate = serializers.FloatField(read_only=True)
    goal_contributions = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = SeasonSummary
        fields = [
            'id',
            'player',
            'player_id',
            'season_year',
            'total_matches',
            'total_wins',
            'total_draws',
            'total_losses',
            'total_goals',
            'total_assists',
            'total_yellow_cards',
            'total_red_cards',
            'championships_won',
            'runner_up_finishes',
            'golden_boot',
            'best_player',
            'win_rate',
            'goal_contributions',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_season_year(self, value):
        """Valida o ano da temporada."""
        from django.utils import timezone
        current_year = timezone.now().year
        
        if value < 2020 or value > current_year + 1:
            raise serializers.ValidationError(f'Ano da temporada deve estar entre 2020 e {current_year + 1}.')
        return value


class SeasonSummaryListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para listagem de resumos.
    """
    player_name = serializers.CharField(source='player.player_name', read_only=True)
    win_rate = serializers.FloatField(read_only=True)
    goal_contributions = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = SeasonSummary
        fields = [
            'id',
            'player_name',
            'season_year',
            'total_matches',
            'total_goals',
            'total_assists',
            'goal_contributions',
            'championships_won',
            'golden_boot',
            'best_player',
            'win_rate'
        ]


class TopScorerSerializer(serializers.ModelSerializer):
    """
    Serializer para artilheiros.
    """
    championship = ChampionshipListSerializer(read_only=True)
    championship_id = serializers.IntegerField(write_only=True)
    player = PlayerProfileListSerializer(read_only=True)
    player_id = serializers.IntegerField(write_only=True)
    team = TeamListSerializer(read_only=True)
    team_id = serializers.IntegerField(write_only=True)
    
    # Campos calculados
    goals_per_match = serializers.FloatField(read_only=True)
    
    class Meta:
        model = TopScorer
        fields = [
            'id',
            'championship',
            'championship_id',
            'player',
            'player_id',
            'team',
            'team_id',
            'goals',
            'assists',
            'matches_played',
            'position',
            'goals_per_match',
            'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']
    
    def validate_position(self, value):
        """Valida a posição."""
        if value < 1:
            raise serializers.ValidationError('Posição deve ser maior que 0.')
        return value


class TopScorerListSerializer(serializers.ModelSerializer):
    """
    Serializer simplificado para ranking de artilheiros.
    """
    player_name = serializers.CharField(source='player.player_name', read_only=True)
    team_name = serializers.CharField(source='team.name', read_only=True)
    goals_per_match = serializers.FloatField(read_only=True)
    
    class Meta:
        model = TopScorer
        fields = [
            'position',
            'player_name',
            'team_name',
            'goals',
            'assists',
            'matches_played',
            'goals_per_match'
        ]


class LeaderboardSerializer(serializers.Serializer):
    """
    Serializer para leaderboards gerais.
    """
    top_scorers = TopScorerListSerializer(many=True, read_only=True)
    top_assisters = serializers.SerializerMethodField()
    best_players = serializers.SerializerMethodField()
    
    def get_top_assisters(self, obj):
        """Retorna os jogadores com mais assistências."""
        championship_id = self.context.get('championship_id')
        if not championship_id:
            return []
        
        stats = PlayerStatistics.objects.filter(
            championship_id=championship_id
        ).select_related('player', 'team').order_by('-assists', '-goals')[:10]
        
        return [{
            'player_name': stat.player.player_name,
            'team_name': stat.team.name,
            'assists': stat.assists,
            'goals': stat.goals,
            'matches_played': stat.matches_played
        } for stat in stats]
    
    def get_best_players(self, obj):
        """Retorna os jogadores com melhor média."""
        championship_id = self.context.get('championship_id')
        if not championship_id:
            return []
        
        stats = PlayerStatistics.objects.filter(
            championship_id=championship_id,
            matches_played__gte=3  # Mínimo de 3 jogos
        ).select_related('player', 'team').order_by('-average_rating', '-goals')[:10]
        
        return [{
            'player_name': stat.player.player_name,
            'team_name': stat.team.name,
            'average_rating': float(stat.average_rating),
            'matches_played': stat.matches_played,
            'goals': stat.goals,
            'assists': stat.assists
        } for stat in stats]
