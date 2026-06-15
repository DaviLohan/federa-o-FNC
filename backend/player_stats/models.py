from django.db import models
from django.db.models import Sum, Count, Q, F
from users.models import PlayerProfile
from fnc_teams.models import Team
from fnc_championships.models import Championship
from fnc_matches.models import Match


class PlayerStatistics(models.Model):
    """
    Estatísticas individuais de um jogador em um campeonato.
    """
    
    player = models.ForeignKey(
        PlayerProfile,
        on_delete=models.CASCADE,
        related_name='statistics',
        verbose_name='jogador'
    )
    
    championship = models.ForeignKey(
        Championship,
        on_delete=models.CASCADE,
        related_name='player_statistics',
        verbose_name='campeonato'
    )
    
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='player_statistics',
        verbose_name='time',
        help_text='Time pelo qual o jogador estava jogando'
    )
    
    # Estatísticas de jogos
    matches_played = models.PositiveIntegerField('partidas jogadas', default=0)
    matches_won = models.PositiveIntegerField('vitórias', default=0)
    matches_drawn = models.PositiveIntegerField('empates', default=0)
    matches_lost = models.PositiveIntegerField('derrotas', default=0)
    
    # Estatísticas de gols
    goals = models.PositiveIntegerField('gols', default=0)
    assists = models.PositiveIntegerField('assistências', default=0)
    
    # Estatísticas disciplinares
    yellow_cards = models.PositiveIntegerField('cartões amarelos', default=0)
    red_cards = models.PositiveIntegerField('cartões vermelhos', default=0)
    
    # Minutos jogados
    minutes_played = models.PositiveIntegerField('minutos jogados', default=0)
    
    # Estatísticas avançadas (podem ser calculadas depois)
    clean_sheets = models.PositiveIntegerField(
        'jogos sem sofrer gols',
        default=0,
        help_text='Apenas para goleiros'
    )
    
    # Rating médio (0-10)
    average_rating = models.DecimalField(
        'nota média',
        max_digits=3,
        decimal_places=2,
        default=0.00,
        help_text='Nota média do jogador (0-10)'
    )
    
    # Timestamps
    updated_at = models.DateTimeField('atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'estatística do jogador'
        verbose_name_plural = 'estatísticas dos jogadores'
        unique_together = [['player', 'championship', 'team']]
        ordering = ['-goals', '-assists']
    
    def __str__(self):
        return f'{self.player} - {self.championship} ({self.team})'
    
    @property
    def goals_per_match(self):
        """Média de gols por partida."""
        if self.matches_played > 0:
            return round(self.goals / self.matches_played, 2)
        return 0.0
    
    @property
    def assists_per_match(self):
        """Média de assistências por partida."""
        if self.matches_played > 0:
            return round(self.assists / self.matches_played, 2)
        return 0.0
    
    @property
    def goal_contributions(self):
        """Total de participações em gols (gols + assistências)."""
        return self.goals + self.assists
    
    @property
    def win_rate(self):
        """Percentual de vitórias."""
        if self.matches_played > 0:
            return round((self.matches_won / self.matches_played) * 100, 1)
        return 0.0


class TeamStatistics(models.Model):
    """
    Estatísticas de um time em um campeonato.
    """
    
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='statistics',
        verbose_name='time'
    )
    
    championship = models.ForeignKey(
        Championship,
        on_delete=models.CASCADE,
        related_name='team_statistics',
        verbose_name='campeonato'
    )
    
    # Estatísticas de jogos
    matches_played = models.PositiveIntegerField('partidas jogadas', default=0)
    matches_won = models.PositiveIntegerField('vitórias', default=0)
    matches_drawn = models.PositiveIntegerField('empates', default=0)
    matches_lost = models.PositiveIntegerField('derrotas', default=0)
    
    # Estatísticas de gols
    goals_scored = models.PositiveIntegerField('gols marcados', default=0)
    goals_conceded = models.PositiveIntegerField('gols sofridos', default=0)
    
    # Estatísticas disciplinares
    yellow_cards = models.PositiveIntegerField('cartões amarelos', default=0)
    red_cards = models.PositiveIntegerField('cartões vermelhos', default=0)
    
    # Estatísticas de posse/ataque (para implementação futura)
    clean_sheets = models.PositiveIntegerField('jogos sem sofrer gols', default=0)
    biggest_win_margin = models.PositiveIntegerField('maior goleada', default=0)
    biggest_loss_margin = models.PositiveIntegerField('maior derrota', default=0)
    
    # Sequências
    current_win_streak = models.PositiveIntegerField('sequência de vitórias atual', default=0)
    longest_win_streak = models.PositiveIntegerField('maior sequência de vitórias', default=0)
    current_unbeaten_streak = models.PositiveIntegerField('sequência sem perder atual', default=0)
    longest_unbeaten_streak = models.PositiveIntegerField('maior sequência sem perder', default=0)
    
    # Timestamps
    updated_at = models.DateTimeField('atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'estatística do time'
        verbose_name_plural = 'estatísticas dos times'
        unique_together = [['team', 'championship']]
        ordering = ['-matches_won', '-goals_scored']
    
    def __str__(self):
        return f'{self.team} - {self.championship}'
    
    @property
    def goal_difference(self):
        """Saldo de gols."""
        return self.goals_scored - self.goals_conceded
    
    @property
    def points(self):
        """Total de pontos (vitória = 3, empate = 1)."""
        return (self.matches_won * 3) + self.matches_drawn
    
    @property
    def win_rate(self):
        """Percentual de vitórias."""
        if self.matches_played > 0:
            return round((self.matches_won / self.matches_played) * 100, 1)
        return 0.0
    
    @property
    def goals_per_match(self):
        """Média de gols marcados por partida."""
        if self.matches_played > 0:
            return round(self.goals_scored / self.matches_played, 2)
        return 0.0
    
    @property
    def goals_conceded_per_match(self):
        """Média de gols sofridos por partida."""
        if self.matches_played > 0:
            return round(self.goals_conceded / self.matches_played, 2)
        return 0.0
    
    @property
    def clean_sheet_rate(self):
        """Percentual de jogos sem sofrer gols."""
        if self.matches_played > 0:
            return round((self.clean_sheets / self.matches_played) * 100, 1)
        return 0.0


class SeasonSummary(models.Model):
    """
    Resumo da temporada de um jogador (agregado de todos os campeonatos).
    """
    
    player = models.OneToOneField(
        PlayerProfile,
        on_delete=models.CASCADE,
        related_name='season_summary',
        verbose_name='jogador'
    )
    
    # Temporada
    season_year = models.PositiveIntegerField(
        'ano da temporada',
        help_text='Ano da temporada (ex: 2024)'
    )
    
    # Estatísticas totais
    total_matches = models.PositiveIntegerField('partidas totais', default=0)
    total_wins = models.PositiveIntegerField('vitórias totais', default=0)
    total_draws = models.PositiveIntegerField('empates totais', default=0)
    total_losses = models.PositiveIntegerField('derrotas totais', default=0)
    
    total_goals = models.PositiveIntegerField('gols totais', default=0)
    total_assists = models.PositiveIntegerField('assistências totais', default=0)
    
    total_yellow_cards = models.PositiveIntegerField('cartões amarelos totais', default=0)
    total_red_cards = models.PositiveIntegerField('cartões vermelhos totais', default=0)
    
    # Conquistas
    championships_won = models.PositiveIntegerField('campeonatos vencidos', default=0)
    runner_up_finishes = models.PositiveIntegerField('vice-campeonatos', default=0)
    
    # Prêmios individuais
    golden_boot = models.BooleanField('artilheiro', default=False)
    best_player = models.BooleanField('melhor jogador', default=False)
    
    # Timestamps
    created_at = models.DateTimeField('criado em', auto_now_add=True)
    updated_at = models.DateTimeField('atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'resumo da temporada'
        verbose_name_plural = 'resumos das temporadas'
        unique_together = [['player', 'season_year']]
        ordering = ['-season_year']
    
    def __str__(self):
        return f'{self.player} - Temporada {self.season_year}'
    
    @property
    def win_rate(self):
        """Percentual de vitórias."""
        if self.total_matches > 0:
            return round((self.total_wins / self.total_matches) * 100, 1)
        return 0.0
    
    @property
    def goal_contributions(self):
        """Total de participações em gols."""
        return self.total_goals + self.total_assists


class TopScorer(models.Model):
    """
    Ranking de artilheiros por campeonato.
    """
    
    championship = models.ForeignKey(
        Championship,
        on_delete=models.CASCADE,
        related_name='top_scorers',
        verbose_name='campeonato'
    )
    
    player = models.ForeignKey(
        PlayerProfile,
        on_delete=models.CASCADE,
        related_name='top_scorer_awards',
        verbose_name='jogador'
    )
    
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        verbose_name='time'
    )
    
    goals = models.PositiveIntegerField('gols', default=0)
    assists = models.PositiveIntegerField('assistências', default=0)
    matches_played = models.PositiveIntegerField('partidas jogadas', default=0)
    
    # Ranking
    position = models.PositiveIntegerField(
        'posição',
        help_text='Posição no ranking de artilheiros'
    )
    
    # Timestamps
    updated_at = models.DateTimeField('atualizado em', auto_now=True)
    
    class Meta:
        verbose_name = 'artilheiro'
        verbose_name_plural = 'artilheiros'
        unique_together = [['championship', 'player']]
        ordering = ['championship', 'position']
    
    def __str__(self):
        return f'{self.position}º - {self.player} ({self.goals} gols)'
    
    @property
    def goals_per_match(self):
        """Média de gols por partida."""
        if self.matches_played > 0:
            return round(self.goals / self.matches_played, 2)
        return 0.0


class TeamPerformanceMatch(models.Model):
    """Snapshot de desempenho coletivo de um time em uma partida."""

    class Context(models.TextChoices):
        CHAMPIONSHIP = 'championship', 'Campeonato'
        FRIENDLY = 'friendly', 'Amistoso'

    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='performance_matches',
        verbose_name='time',
    )
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name='team_performance_snapshots',
        verbose_name='partida',
    )
    championship = models.ForeignKey(
        Championship,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='team_performance_matches',
        verbose_name='campeonato',
    )

    context = models.CharField('contexto', max_length=20, choices=Context.choices)
    is_home = models.BooleanField('jogou em casa', default=False)
    played_at = models.DateTimeField('jogada em')

    opponent_team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='opponent_performance_matches',
        verbose_name='adversário',
    )
    opponent_name = models.CharField('nome do adversário', max_length=200)

    goals_scored = models.PositiveIntegerField('gols marcados', default=0)
    goals_conceded = models.PositiveIntegerField('gols sofridos', default=0)
    result = models.CharField('resultado', max_length=1, choices=[('W', 'Vitória'), ('D', 'Empate'), ('L', 'Derrota')])
    clean_sheet = models.BooleanField('clean sheet', default=False)

    has_advanced_data = models.BooleanField('tem dados avançados', default=False)
    advanced_players = models.PositiveIntegerField('jogadores com dados avançados', default=0)
    lineup_players = models.PositiveIntegerField('jogadores escalados', default=0)

    average_rating = models.DecimalField('nota média', max_digits=5, decimal_places=2, null=True, blank=True)
    passes_made = models.PositiveIntegerField('passes certos', default=0)
    pass_attempts = models.PositiveIntegerField('passes tentados', default=0)
    tackles_made = models.PositiveIntegerField('desarmes certos', default=0)
    tackle_attempts = models.PositiveIntegerField('desarmes tentados', default=0)
    saves = models.PositiveIntegerField('defesas', default=0)

    created_at = models.DateTimeField('criado em', auto_now_add=True)
    updated_at = models.DateTimeField('atualizado em', auto_now=True)

    class Meta:
        verbose_name = 'desempenho do time por partida'
        verbose_name_plural = 'desempenhos do time por partida'
        ordering = ['-played_at']
        constraints = [
            models.UniqueConstraint(fields=['team', 'match'], name='unique_team_performance_match'),
        ]

    def __str__(self):
        return f'{self.team} vs {self.opponent_name} ({self.played_at:%d/%m/%Y})'


class TeamPlayerPerformance(models.Model):
    """Snapshot de desempenho individual de um jogador em uma partida pelo time."""

    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='player_performance_matches',
        verbose_name='time',
    )
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name='player_performance_snapshots',
        verbose_name='partida',
    )
    team_performance_match = models.ForeignKey(
        TeamPerformanceMatch,
        on_delete=models.CASCADE,
        related_name='players',
        verbose_name='snapshot do time',
    )
    championship = models.ForeignKey(
        Championship,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='player_performance_matches',
        verbose_name='campeonato',
    )
    player = models.ForeignKey(
        PlayerProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='team_performance_matches',
        verbose_name='jogador',
    )

    player_name_snapshot = models.CharField('nome do jogador', max_length=200)
    position = models.CharField('posição', max_length=20, blank=True)
    has_advanced_data = models.BooleanField('tem dados avançados', default=False)

    matches_played = models.PositiveIntegerField('partidas consideradas', default=1)
    rating = models.DecimalField('nota', max_digits=5, decimal_places=2, null=True, blank=True)
    goals = models.PositiveIntegerField('gols', default=0)
    assists = models.PositiveIntegerField('assistências', default=0)
    passes_made = models.PositiveIntegerField('passes certos', default=0)
    pass_attempts = models.PositiveIntegerField('passes tentados', default=0)
    shots = models.PositiveIntegerField('finalizações', default=0)
    tackles_made = models.PositiveIntegerField('desarmes certos', default=0)
    tackle_attempts = models.PositiveIntegerField('desarmes tentados', default=0)
    saves = models.PositiveIntegerField('defesas', default=0)
    seconds_played = models.PositiveIntegerField('segundos jogados', default=0)
    cards = models.PositiveIntegerField('cartões', default=0)

    created_at = models.DateTimeField('criado em', auto_now_add=True)
    updated_at = models.DateTimeField('atualizado em', auto_now=True)

    class Meta:
        verbose_name = 'desempenho do jogador por partida'
        verbose_name_plural = 'desempenhos dos jogadores por partida'
        ordering = ['-match__scheduled_date', 'player_name_snapshot']
        constraints = [
            models.UniqueConstraint(
                fields=['team', 'match', 'player_name_snapshot'],
                name='unique_team_player_performance_match',
            )
        ]

    def __str__(self):
        return f'{self.player_name_snapshot} - {self.team} ({self.match_id})'


class RankingCycle(models.Model):
    """Ciclo mensal do ranking competitivo de jogadores."""

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Aberto'
        CLOSED = 'CLOSED', 'Fechado'

    slug = models.CharField('identificador do ciclo', max_length=7, unique=True, help_text='Formato YYYY-MM')
    starts_at = models.DateTimeField('início do ciclo')
    ends_at = models.DateTimeField('fim do ciclo')
    status = models.CharField('status', max_length=10, choices=Status.choices, default=Status.OPEN)
    processed_at = models.DateTimeField('processado em', null=True, blank=True)
    created_at = models.DateTimeField('criado em', auto_now_add=True)
    updated_at = models.DateTimeField('atualizado em', auto_now=True)

    class Meta:
        verbose_name = 'ciclo de ranking'
        verbose_name_plural = 'ciclos de ranking'
        ordering = ['-starts_at']

    def __str__(self):
        return f'Ciclo {self.slug} ({self.get_status_display()})'


class PlayerTierState(models.Model):
    """Estado consolidado por jogador em um ciclo."""

    class Tier(models.TextChoices):
        BRONZE = 'BRONZE', 'Bronze'
        SILVER = 'SILVER', 'Prata'
        GOLD = 'GOLD', 'Ouro'
        PLATINUM = 'PLATINUM', 'Platina'

    cycle = models.ForeignKey(
        RankingCycle,
        on_delete=models.CASCADE,
        related_name='player_states',
        verbose_name='ciclo',
    )
    player = models.ForeignKey(
        PlayerProfile,
        on_delete=models.CASCADE,
        related_name='tier_states',
        verbose_name='jogador',
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='player_tier_states',
        verbose_name='time atual',
    )
    tier = models.CharField('rank', max_length=10, choices=Tier.choices, default=Tier.BRONZE)
    score = models.DecimalField('pontuação final', max_digits=7, decimal_places=2, default=0)
    average_rating = models.DecimalField('nota média', max_digits=5, decimal_places=2, default=0)
    goals = models.PositiveIntegerField('gols', default=0)
    assists = models.PositiveIntegerField('assistências', default=0)
    matches_played = models.PositiveIntegerField('partidas jogadas', default=0)
    tier_position = models.PositiveIntegerField('posição no rank', default=0)
    general_position = models.PositiveIntegerField('posição geral', default=0)
    is_promotion_zone = models.BooleanField('está na zona de promoção', default=False)
    promotion_eligible = models.BooleanField('elegível para promoção', default=False)
    promoted_to_tier = models.CharField('promovido para rank', max_length=10, choices=Tier.choices, blank=True)
    created_at = models.DateTimeField('criado em', auto_now_add=True)
    updated_at = models.DateTimeField('atualizado em', auto_now=True)

    class Meta:
        verbose_name = 'estado de rank do jogador'
        verbose_name_plural = 'estados de rank dos jogadores'
        ordering = ['general_position', '-score']
        constraints = [
            models.UniqueConstraint(fields=['cycle', 'player'], name='unique_player_tier_state_cycle_player'),
        ]

    def __str__(self):
        return f'{self.player} - {self.get_tier_display()} ({self.cycle.slug})'


class TierPromotionAudit(models.Model):
    """Histórico de promoções aplicadas no fechamento do ciclo."""

    cycle = models.ForeignKey(
        RankingCycle,
        on_delete=models.CASCADE,
        related_name='promotion_audits',
        verbose_name='ciclo',
    )
    player = models.ForeignKey(
        PlayerProfile,
        on_delete=models.CASCADE,
        related_name='tier_promotion_audits',
        verbose_name='jogador',
    )
    from_tier = models.CharField('rank anterior', max_length=10, choices=PlayerTierState.Tier.choices)
    to_tier = models.CharField('novo rank', max_length=10, choices=PlayerTierState.Tier.choices)
    score_at_promotion = models.DecimalField('pontuação na promoção', max_digits=7, decimal_places=2, default=0)
    tier_position = models.PositiveIntegerField('posição no rank', default=0)
    promoted_at = models.DateTimeField('promovido em', auto_now_add=True)

    class Meta:
        verbose_name = 'auditoria de promoção'
        verbose_name_plural = 'auditorias de promoção'
        ordering = ['-promoted_at']
        constraints = [
            models.UniqueConstraint(fields=['cycle', 'player'], name='unique_tier_promotion_per_cycle_player'),
        ]

    def __str__(self):
        return f'{self.player} {self.from_tier}->{self.to_tier} ({self.cycle.slug})'


class GlobalTeamRanking(models.Model):
    """Ranking geral acumulado de um time na plataforma."""

    class Tier(models.TextChoices):
        TIER_1 = 'TIER_1', 'Tier 1'
        TIER_2 = 'TIER_2', 'Tier 2'
        TIER_3 = 'TIER_3', 'Tier 3'

    team = models.OneToOneField(
        Team,
        on_delete=models.CASCADE,
        related_name='global_ranking',
        verbose_name='time',
    )
    total_points = models.PositiveIntegerField('pontos totais', default=0)
    matches_played = models.PositiveIntegerField('partidas jogadas', default=0)
    wins = models.PositiveIntegerField('vitórias', default=0)
    draws = models.PositiveIntegerField('empates', default=0)
    losses = models.PositiveIntegerField('derrotas', default=0)
    goals_for = models.PositiveIntegerField('gols marcados', default=0)
    goals_against = models.PositiveIntegerField('gols sofridos', default=0)
    goal_difference = models.IntegerField('saldo de gols', default=0)
    tier = models.CharField(
        'tier',
        max_length=10,
        choices=Tier.choices,
        default=Tier.TIER_3,
    )
    updated_at = models.DateTimeField('atualizado em', auto_now=True)

    class Meta:
        verbose_name = 'ranking geral do time'
        verbose_name_plural = 'ranking geral dos times'
        ordering = ['-total_points', '-wins', '-goal_difference', 'losses', 'team__name']

    def __str__(self):
        return f'{self.team.name} - {self.total_points} pts ({self.get_tier_display()})'

    @property
    def win_rate(self):
        if self.matches_played > 0:
            return round((self.wins / self.matches_played) * 100, 2)
        return 0.0


class GlobalTeamRankingEntry(models.Model):
    """Histórico de pontos aplicados por partida para cada time."""

    class Result(models.TextChoices):
        WIN = 'WIN', 'Vitória'
        DRAW = 'DRAW', 'Empate'
        LOSS = 'LOSS', 'Derrota'

    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name='global_ranking_entries',
        verbose_name='partida',
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.CASCADE,
        related_name='global_ranking_entries',
        verbose_name='time',
    )
    result = models.CharField('resultado', max_length=10, choices=Result.choices)
    points_awarded = models.PositiveIntegerField('pontos concedidos', default=0)
    goals_for = models.PositiveIntegerField('gols marcados', default=0)
    goals_against = models.PositiveIntegerField('gols sofridos', default=0)
    counted = models.BooleanField('contabilizado no ranking', default=True)
    created_at = models.DateTimeField('criado em', auto_now_add=True)
    updated_at = models.DateTimeField('atualizado em', auto_now=True)

    class Meta:
        verbose_name = 'entrada de ranking global'
        verbose_name_plural = 'entradas de ranking global'
        ordering = ['-match__finished_at', '-match_id', 'team__name']
        constraints = [
            models.UniqueConstraint(fields=['match', 'team'], name='unique_global_ranking_entry_match_team'),
        ]

    def __str__(self):
        return f'Match {self.match_id} - {self.team.name}: {self.points_awarded} pts'
