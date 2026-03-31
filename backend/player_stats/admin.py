from django.contrib import admin
from django.utils.html import format_html
from .models import PlayerStatistics, TeamStatistics, SeasonSummary, TopScorer


# ============================================================================
# PLAYER STATISTICS ADMIN
# ============================================================================

@admin.register(PlayerStatistics)
class PlayerStatisticsAdmin(admin.ModelAdmin):
    """
    Admin para estatísticas individuais dos jogadores.
    """
    
    list_display = (
        'player_display',
        'championship_display',
        'team_display',
        'matches_played',
        'goals_assists_display',
        'cards_display',
        'rating_display',
        'win_rate_display'
    )
    
    list_filter = (
        'championship',
        'team',
    )
    
    search_fields = (
        'player__player_name',
        'player__gamer_tag',
        'player__user__email',
        'team__name',
        'championship__name',
    )
    
    readonly_fields = (
        'updated_at',
        'goals_per_match_display',
        'assists_per_match_display',
        'goal_contributions_display',
        'win_rate_display'
    )
    
    fieldsets = (
        ('Jogador e Campeonato', {
            'fields': (
                'player',
                'championship',
                'team'
            )
        }),
        ('Estatísticas de Jogos', {
            'fields': (
                'matches_played',
                'matches_won',
                'matches_drawn',
                'matches_lost',
                'win_rate_display'
            )
        }),
        ('Estatísticas Ofensivas', {
            'fields': (
                'goals',
                'assists',
                'goals_per_match_display',
                'assists_per_match_display',
                'goal_contributions_display'
            )
        }),
        ('Estatísticas Disciplinares', {
            'fields': (
                'yellow_cards',
                'red_cards'
            )
        }),
        ('Outras Estatísticas', {
            'fields': (
                'minutes_played',
                'clean_sheets',
                'average_rating'
            )
        }),
        ('Timestamps', {
            'fields': ('updated_at',),
            'classes': ('collapse',)
        }),
    )
    
    raw_id_fields = ('player', 'championship', 'team')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('player', 'player__user', 'championship', 'team')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def player_display(self, obj):
        """Exibe o jogador com link."""
        return format_html(
            '<a href="/admin/users/playerprofile/{}/change/">{}</a>',
            obj.player.id,
            obj.player.player_name or obj.player.user.get_full_name()
        )
    player_display.short_description = 'Jogador'
    player_display.admin_order_field = 'player__player_name'
    
    def championship_display(self, obj):
        """Exibe o campeonato com link."""
        return format_html(
            '<a href="/admin/fnc_championships/championship/{}/change/">{}</a>',
            obj.championship.id,
            obj.championship.name
        )
    championship_display.short_description = 'Campeonato'
    
    def team_display(self, obj):
        """Exibe o time com link."""
        return format_html(
            '<a href="/admin/fnc_teams/team/{}/change/">{}</a>',
            obj.team.id,
            obj.team.name
        )
    team_display.short_description = 'Time'
    
    def goals_assists_display(self, obj):
        """Exibe gols e assistências."""
        return format_html(
            '<span style="color: #28a745; font-weight: bold;">⚽ {}</span> | '
            '<span style="color: #007bff; font-weight: bold;">🎯 {}</span>',
            obj.goals,
            obj.assists
        )
    goals_assists_display.short_description = 'G + A'
    
    def cards_display(self, obj):
        """Exibe cartões."""
        return format_html(
            '<span style="color: #ffc107;">🟨 {}</span> | '
            '<span style="color: #dc3545;">🟥 {}</span>',
            obj.yellow_cards,
            obj.red_cards
        )
    cards_display.short_description = 'Cartões'
    
    def rating_display(self, obj):
        """Exibe a nota média."""
        if obj.average_rating >= 8:
            color = '#28a745'
        elif obj.average_rating >= 6:
            color = '#007bff'
        elif obj.average_rating >= 5:
            color = '#ffc107'
        else:
            color = '#dc3545'
        
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
            '{:.2f}</span>',
            color,
            obj.average_rating
        )
    rating_display.short_description = 'Nota'
    rating_display.admin_order_field = 'average_rating'
    
    def win_rate_display(self, obj):
        """Exibe o aproveitamento."""
        rate = obj.win_rate
        color = 'green' if rate >= 60 else 'orange' if rate >= 40 else 'red'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.1f}%</span>',
            color,
            rate
        )
    win_rate_display.short_description = 'Aproveitamento'
    
    def goals_per_match_display(self, obj):
        """Média de gols por partida."""
        return f'{obj.goals_per_match:.2f}'
    goals_per_match_display.short_description = 'Gols/Jogo'
    
    def assists_per_match_display(self, obj):
        """Média de assistências por partida."""
        return f'{obj.assists_per_match:.2f}'
    assists_per_match_display.short_description = 'Assist/Jogo'
    
    def goal_contributions_display(self, obj):
        """Participações em gols."""
        return format_html(
            '<span style="font-weight: bold; color: #007bff;">{}</span>',
            obj.goal_contributions
        )
    goal_contributions_display.short_description = 'Participações'


# ============================================================================
# TEAM STATISTICS ADMIN
# ============================================================================

@admin.register(TeamStatistics)
class TeamStatisticsAdmin(admin.ModelAdmin):
    """
    Admin para estatísticas dos times.
    """
    
    list_display = (
        'team_display',
        'championship_display',
        'matches_played',
        'record_display',
        'goals_display',
        'points_display',
        'win_rate_display'
    )
    
    list_filter = (
        'championship',
    )
    
    search_fields = (
        'team__name',
        'championship__name',
    )
    
    readonly_fields = (
        'updated_at',
        'goal_difference_display',
        'points_display',
        'win_rate_display',
        'goals_per_match_display',
        'goals_conceded_per_match_display',
        'clean_sheet_rate_display'
    )
    
    fieldsets = (
        ('Time e Campeonato', {
            'fields': (
                'team',
                'championship'
            )
        }),
        ('Estatísticas de Jogos', {
            'fields': (
                'matches_played',
                'matches_won',
                'matches_drawn',
                'matches_lost',
                'points_display',
                'win_rate_display'
            )
        }),
        ('Estatísticas de Gols', {
            'fields': (
                'goals_scored',
                'goals_conceded',
                'goal_difference_display',
                'goals_per_match_display',
                'goals_conceded_per_match_display',
                'clean_sheets',
                'clean_sheet_rate_display'
            )
        }),
        ('Estatísticas Disciplinares', {
            'fields': (
                'yellow_cards',
                'red_cards'
            )
        }),
        ('Recordes', {
            'fields': (
                'biggest_win_margin',
                'biggest_loss_margin'
            ),
            'classes': ('collapse',)
        }),
        ('Sequências', {
            'fields': (
                'current_win_streak',
                'longest_win_streak',
                'current_unbeaten_streak',
                'longest_unbeaten_streak'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('updated_at',),
            'classes': ('collapse',)
        }),
    )
    
    raw_id_fields = ('team', 'championship')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('team', 'championship')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def team_display(self, obj):
        """Exibe o time com link."""
        return format_html(
            '<a href="/admin/fnc_teams/team/{}/change/"><strong>{}</strong></a>',
            obj.team.id,
            obj.team.name
        )
    team_display.short_description = 'Time'
    team_display.admin_order_field = 'team__name'
    
    def championship_display(self, obj):
        """Exibe o campeonato com link."""
        return format_html(
            '<a href="/admin/fnc_championships/championship/{}/change/">{}</a>',
            obj.championship.id,
            obj.championship.name
        )
    championship_display.short_description = 'Campeonato'
    
    def record_display(self, obj):
        """Exibe o retrospecto (V-E-D)."""
        return format_html(
            '<span style="color: #28a745; font-weight: bold;">{}</span>-'
            '<span style="color: #ffc107; font-weight: bold;">{}</span>-'
            '<span style="color: #dc3545; font-weight: bold;">{}</span>',
            obj.matches_won,
            obj.matches_drawn,
            obj.matches_lost
        )
    record_display.short_description = 'V-E-D'
    
    def goals_display(self, obj):
        """Exibe gols pró e contra."""
        diff = obj.goal_difference
        diff_color = 'green' if diff > 0 else 'red' if diff < 0 else 'gray'
        diff_sign = '+' if diff > 0 else ''
        
        return format_html(
            '<span style="color: #28a745; font-weight: bold;">{}</span> : '
            '<span style="color: #dc3545; font-weight: bold;">{}</span> '
            '(<span style="color: {}; font-weight: bold;">{}{}</span>)',
            obj.goals_scored,
            obj.goals_conceded,
            diff_color,
            diff_sign,
            diff
        )
    goals_display.short_description = 'Gols (SG)'
    
    def points_display(self, obj):
        """Exibe os pontos."""
        return format_html(
            '<span style="background-color: #007bff; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold; font-size: 14px;">'
            '{}</span>',
            obj.points
        )
    points_display.short_description = 'Pontos'
    
    def win_rate_display(self, obj):
        """Exibe o aproveitamento."""
        rate = obj.win_rate
        color = 'green' if rate >= 60 else 'orange' if rate >= 40 else 'red'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.1f}%</span>',
            color,
            rate
        )
    win_rate_display.short_description = 'Aproveit.'
    
    def goal_difference_display(self, obj):
        """Saldo de gols."""
        diff = obj.goal_difference
        color = 'green' if diff > 0 else 'red' if diff < 0 else 'gray'
        sign = '+' if diff > 0 else ''
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}{}</span>',
            color,
            sign,
            diff
        )
    goal_difference_display.short_description = 'Saldo'
    
    def goals_per_match_display(self, obj):
        """Média de gols marcados."""
        return f'{obj.goals_per_match:.2f}'
    goals_per_match_display.short_description = 'Gols/Jogo'
    
    def goals_conceded_per_match_display(self, obj):
        """Média de gols sofridos."""
        return f'{obj.goals_conceded_per_match:.2f}'
    goals_conceded_per_match_display.short_description = 'Gols Sofridos/Jogo'
    
    def clean_sheet_rate_display(self, obj):
        """Taxa de jogos sem sofrer gols."""
        return f'{obj.clean_sheet_rate:.1f}%'
    clean_sheet_rate_display.short_description = 'Taxa Clean Sheet'


# ============================================================================
# SEASON SUMMARY ADMIN
# ============================================================================

@admin.register(SeasonSummary)
class SeasonSummaryAdmin(admin.ModelAdmin):
    """
    Admin para resumo das temporadas dos jogadores.
    """
    
    list_display = (
        'player_display',
        'season_year',
        'total_matches',
        'stats_display',
        'achievements_display',
        'win_rate_display'
    )
    
    list_filter = (
        'season_year',
        'golden_boot',
        'best_player',
    )
    
    search_fields = (
        'player__player_name',
        'player__gamer_tag',
        'player__user__email',
    )
    
    readonly_fields = (
        'created_at',
        'updated_at',
        'win_rate_display',
        'goal_contributions_display'
    )
    
    fieldsets = (
        ('Jogador e Temporada', {
            'fields': (
                'player',
                'season_year'
            )
        }),
        ('Estatísticas Totais', {
            'fields': (
                'total_matches',
                'total_wins',
                'total_draws',
                'total_losses',
                'win_rate_display'
            )
        }),
        ('Estatísticas Ofensivas', {
            'fields': (
                'total_goals',
                'total_assists',
                'goal_contributions_display'
            )
        }),
        ('Cartões', {
            'fields': (
                'total_yellow_cards',
                'total_red_cards'
            )
        }),
        ('Conquistas', {
            'fields': (
                'championships_won',
                'runner_up_finishes',
                'golden_boot',
                'best_player'
            )
        }),
        ('Timestamps', {
            'fields': (
                'created_at',
                'updated_at'
            ),
            'classes': ('collapse',)
        }),
    )
    
    raw_id_fields = ('player',)
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('player', 'player__user')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def player_display(self, obj):
        """Exibe o jogador com link."""
        return format_html(
            '<a href="/admin/users/playerprofile/{}/change/"><strong>{}</strong></a>',
            obj.player.id,
            obj.player.player_name or obj.player.user.get_full_name()
        )
    player_display.short_description = 'Jogador'
    player_display.admin_order_field = 'player__player_name'
    
    def stats_display(self, obj):
        """Exibe estatísticas principais."""
        return format_html(
            '⚽ <span style="color: #28a745; font-weight: bold;">{}</span> | '
            '🎯 <span style="color: #007bff; font-weight: bold;">{}</span> | '
            '🏆 <span style="color: #ffc107; font-weight: bold;">{}</span>',
            obj.total_goals,
            obj.total_assists,
            obj.championships_won
        )
    stats_display.short_description = 'Estatísticas'
    
    def achievements_display(self, obj):
        """Exibe conquistas."""
        badges = []
        if obj.golden_boot:
            badges.append('<span style="background-color: #FFD700; color: white; padding: 2px 8px; border-radius: 3px;">👞 Artilheiro</span>')
        if obj.best_player:
            badges.append('<span style="background-color: #007bff; color: white; padding: 2px 8px; border-radius: 3px;">⭐ Melhor Jogador</span>')
        if obj.championships_won > 0:
            badges.append(f'<span style="background-color: #28a745; color: white; padding: 2px 8px; border-radius: 3px;">🏆 {obj.championships_won}x Campeão</span>')
        
        return format_html(' '.join(badges)) if badges else '-'
    achievements_display.short_description = 'Conquistas'
    
    def win_rate_display(self, obj):
        """Exibe o aproveitamento."""
        rate = obj.win_rate
        color = 'green' if rate >= 60 else 'orange' if rate >= 40 else 'red'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{:.1f}%</span>',
            color,
            rate
        )
    win_rate_display.short_description = 'Aproveitamento'
    
    def goal_contributions_display(self, obj):
        """Participações em gols."""
        return format_html(
            '<span style="font-weight: bold; color: #007bff;">{}</span>',
            obj.goal_contributions
        )
    goal_contributions_display.short_description = 'Participações'


# ============================================================================
# TOP SCORER ADMIN
# ============================================================================

@admin.register(TopScorer)
class TopScorerAdmin(admin.ModelAdmin):
    """
    Admin para ranking de artilheiros.
    """
    
    list_display = (
        'position_display',
        'player_display',
        'team_display',
        'championship_display',
        'goals_display',
        'assists',
        'matches_played',
        'average_display'
    )
    
    list_filter = (
        'championship',
        'team',
    )
    
    search_fields = (
        'player__player_name',
        'player__gamer_tag',
        'team__name',
        'championship__name',
    )
    
    readonly_fields = (
        'updated_at',
        'goals_per_match_display'
    )
    
    fieldsets = (
        ('Ranking', {
            'fields': (
                'championship',
                'position'
            )
        }),
        ('Jogador', {
            'fields': (
                'player',
                'team'
            )
        }),
        ('Estatísticas', {
            'fields': (
                'goals',
                'assists',
                'matches_played',
                'goals_per_match_display'
            )
        }),
        ('Timestamps', {
            'fields': ('updated_at',),
            'classes': ('collapse',)
        }),
    )
    
    raw_id_fields = ('championship', 'player', 'team')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('player', 'player__user', 'team', 'championship')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def position_display(self, obj):
        """Exibe a posição com medalha."""
        medals = {
            1: '🥇',
            2: '🥈',
            3: '🥉'
        }
        medal = medals.get(obj.position, '🏆')
        
        colors = {
            1: '#FFD700',
            2: '#C0C0C0',
            3: '#CD7F32'
        }
        color = colors.get(obj.position, '#007bff')
        
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold; font-size: 14px;">'
            '{} {}º</span>',
            color,
            medal,
            obj.position
        )
    position_display.short_description = 'Posição'
    position_display.admin_order_field = 'position'
    
    def player_display(self, obj):
        """Exibe o jogador com link."""
        return format_html(
            '<a href="/admin/users/playerprofile/{}/change/"><strong>{}</strong></a>',
            obj.player.id,
            obj.player.player_name or obj.player.user.get_full_name()
        )
    player_display.short_description = 'Jogador'
    player_display.admin_order_field = 'player__player_name'
    
    def team_display(self, obj):
        """Exibe o time com link."""
        return format_html(
            '<a href="/admin/fnc_teams/team/{}/change/">{}</a>',
            obj.team.id,
            obj.team.name
        )
    team_display.short_description = 'Time'
    
    def championship_display(self, obj):
        """Exibe o campeonato com link."""
        return format_html(
            '<a href="/admin/fnc_championships/championship/{}/change/">{}</a>',
            obj.championship.id,
            obj.championship.name
        )
    championship_display.short_description = 'Campeonato'
    
    def goals_display(self, obj):
        """Exibe os gols com destaque."""
        return format_html(
            '<span style="background-color: #28a745; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold; font-size: 14px;">'
            '⚽ {}</span>',
            obj.goals
        )
    goals_display.short_description = 'Gols'
    goals_display.admin_order_field = 'goals'
    
    def average_display(self, obj):
        """Exibe a média de gols."""
        avg = obj.goals_per_match
        return format_html(
            '<span style="font-weight: bold; color: #007bff;">{:.2f}</span>',
            avg
        )
    average_display.short_description = 'Média'
    
    def goals_per_match_display(self, obj):
        """Média de gols por partida."""
        return f'{obj.goals_per_match:.2f} gols/jogo'
    goals_per_match_display.short_description = 'Média de Gols'
