from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import (
    Match, MatchReport, Goal, Assist, Card, Contestation, 
    MatchProposal, MatchConfirmation, Penalty, PenaltyAppeal
)


# ============================================================================
# INLINE ADMINS
# ============================================================================

class GoalInline(admin.TabularInline):
    """
    Inline para gerenciar gols da partida.
    """
    model = Goal
    extra = 1
    fields = ('scorer', 'team', 'minute', 'goal_type')
    raw_id_fields = ('scorer',)
    verbose_name = 'Gol'
    verbose_name_plural = 'Gols'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('scorer', 'team', 'scorer__user')


class CardInline(admin.TabularInline):
    """
    Inline para gerenciar cartões da partida.
    """
    model = Card
    extra = 0
    fields = ('player', 'team', 'card_type', 'minute', 'reason')
    raw_id_fields = ('player',)
    verbose_name = 'Cartão'
    verbose_name_plural = 'Cartões'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('player', 'team', 'player__user')


# ============================================================================
# MATCH ADMIN
# ============================================================================

@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    """
    Admin customizado para Partidas com gerenciamento completo.
    """
    
    list_display = (
        'match_display',
        'score_display',
        'match_type_badge',
        'status_badge',
        'wo_badge',
        'championship_display',
        'scheduled_date',
        'duration_display'
    )
    
    list_filter = (
        'status',
        'match_type',
        'is_walkover',
        'championship',
        'scheduled_date',
    )
    
    search_fields = (
        'home_team__name',
        'away_team__name',
        'championship__name',
    )
    
    readonly_fields = (
        'created_at',
        'updated_at',
        'duration_display',
        'winner_display',
        'score_display'
    )
    
    fieldsets = (
        ('Informações da Partida', {
            'fields': (
                'home_team',
                'away_team',
                'championship',
                'match_type',
                'round_number'
            )
        }),
        ('Placar', {
            'fields': (
                'home_score',
                'away_score',
                'score_display',
                'winner_display'
            )
        }),
        ('Formações', {
            'fields': (
                'home_formation',
                'away_formation'
            ),
            'classes': ('collapse',)
        }),
        ('Datas e Horários', {
            'fields': (
                'scheduled_date',
                'started_at',
                'finished_at',
                'duration_display'
            )
        }),
        ('Status', {
            'fields': ('status',)
        }),
        ('Walk-Over / Cancelamento', {
            'fields': (
                'is_walkover',
                'walkover_team',
                'walkover_reason',
                'cancelled_at',
                'cancelled_reason'
            ),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': (
                'created_at',
                'updated_at'
            ),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [GoalInline, CardInline]
    
    raw_id_fields = ('home_team', 'away_team', 'championship', 'home_formation', 'away_formation', 'walkover_team')
    
    actions = ['start_matches', 'finish_matches', 'cancel_matches', 'declare_wo_action']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('home_team', 'away_team', 'championship')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def match_display(self, obj):
        """Exibe os times da partida."""
        return format_html(
            '<strong>{}</strong> vs <strong>{}</strong>',
            obj.home_team.name,
            obj.away_team.name
        )
    match_display.short_description = 'Partida'
    
    def score_display(self, obj):
        """Exibe o placar com destaque para o vencedor."""
        home_style = 'font-weight: bold; color: #28a745;' if obj.home_score > obj.away_score else ''
        away_style = 'font-weight: bold; color: #28a745;' if obj.away_score > obj.home_score else ''
        
        return format_html(
            '<span style="font-size: 16px;">'
            '<span style="{}">{}</span> x <span style="{}">{}</span>'
            '</span>',
            home_style,
            obj.home_score,
            away_style,
            obj.away_score
        )
    score_display.short_description = 'Placar'
    
    def match_type_badge(self, obj):
        """Badge colorido para tipo de partida."""
        colors = {
            'FRIENDLY': '#6c757d',
            'CHAMPIONSHIP': '#007bff',
            'PLAYOFF': '#ffc107',
            'FINAL': '#dc3545'
        }
        icons = {
            'FRIENDLY': '🤝',
            'CHAMPIONSHIP': '🏆',
            'PLAYOFF': '⚔️',
            'FINAL': '👑'
        }
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
            '{} {}</span>',
            colors.get(obj.match_type, '#6c757d'),
            icons.get(obj.match_type, ''),
            obj.get_match_type_display()
        )
    match_type_badge.short_description = 'Tipo'
    
    def status_badge(self, obj):
        """Badge colorido para status da partida."""
        colors = {
            'SCHEDULED': '#6c757d',
            'IN_PROGRESS': '#28a745',
            'FINISHED': '#007bff',
            'CANCELLED': '#dc3545',
            'CONTESTED': '#ffc107'
        }
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
            '{}</span>',
            colors.get(obj.status, '#6c757d'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def wo_badge(self, obj):
        """Badge indicando se é WO."""
        if obj.is_walkover:
            return format_html(
                '<span style="background-color: #dc3545; color: white; '
                'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
                '⚠️ WO</span>'
            )
        return '-'
    wo_badge.short_description = 'WO'
    
    def championship_display(self, obj):
        """Exibe o campeonato com link."""
        if obj.championship:
            return format_html(
                '<a href="/admin/fnc_championships/championship/{}/change/">{}</a>',
                obj.championship.id,
                obj.championship.name
            )
        return '-'
    championship_display.short_description = 'Campeonato'
    
    def winner_display(self, obj):
        """Exibe o vencedor da partida."""
        if obj.status != 'FINISHED':
            return format_html('<span style="color: #6c757d;">Em andamento</span>')
        
        winner = obj.winner
        if winner:
            return format_html(
                '<span style="color: #28a745; font-weight: bold;">🏆 {}</span>',
                winner.name
            )
        else:
            return format_html('<span style="color: #ffc107;">⚖️ Empate</span>')
    winner_display.short_description = 'Vencedor'
    
    def duration_display(self, obj):
        """Exibe a duração da partida."""
        duration = obj.duration_minutes
        if duration > 0:
            return format_html(
                '<span style="font-weight: bold;">{} min</span>',
                duration
            )
        return '-'
    duration_display.short_description = 'Duração'
    
    # ========================================================================
    # AÇÕES
    # ========================================================================
    
    def start_matches(self, request, queryset):
        """Inicia partidas agendadas."""
        count = queryset.filter(status='SCHEDULED').update(
            status='IN_PROGRESS',
            started_at=timezone.now()
        )
        self.message_user(
            request,
            f'{count} partida(s) iniciada(s).'
        )
    start_matches.short_description = 'Iniciar partidas'
    
    def finish_matches(self, request, queryset):
        """Finaliza partidas em andamento."""
        count = queryset.filter(status='IN_PROGRESS').update(
            status='FINISHED',
            finished_at=timezone.now()
        )
        self.message_user(
            request,
            f'{count} partida(s) finalizada(s).'
        )
    finish_matches.short_description = 'Finalizar partidas'
    
    def cancel_matches(self, request, queryset):
        """Cancela partidas."""
        count = queryset.exclude(status='FINISHED').update(
            status='CANCELLED'
        )
        self.message_user(
            request,
            f'{count} partida(s) cancelada(s).'
        )
    cancel_matches.short_description = 'Cancelar partidas'
    
    def declare_wo_action(self, request, queryset):
        """
        Redireciona para página customizada de declaração de WO.
        Por enquanto, lista as partidas pendentes de WO.
        """
        from fnc_matches.match_services.walkover import get_matches_pending_wo
        
        # Filtrar apenas partidas SCHEDULED
        scheduled_matches = queryset.filter(status='SCHEDULED', is_walkover=False)
        
        if not scheduled_matches.exists():
            self.message_user(
                request,
                'Nenhuma partida agendada selecionada. Apenas partidas agendadas podem receber WO.',
                level='warning'
            )
            return
        
        # Por enquanto, apenas mostra mensagem
        # TODO: Criar página intermediária para escolher qual time não compareceu
        self.message_user(
            request,
            f'{scheduled_matches.count()} partida(s) selecionada(s). '
            f'Para declarar WO, use a API: POST /api/v1/matches/{{id}}/declare_walkover/',
            level='info'
        )
    declare_wo_action.short_description = 'Declarar Walk-Over (WO)'


# ============================================================================
# MATCH REPORT ADMIN
# ============================================================================

@admin.register(MatchReport)
class MatchReportAdmin(admin.ModelAdmin):
    """
    Admin para gerenciar súmulas das partidas.
    """
    
    list_display = (
        'match_display',
        'status_badge',
        'reported_by_display',
        'approved_by_display',
        'created_at'
    )
    
    list_filter = (
        'status',
        'created_at',
        'approved_at',
    )
    
    search_fields = (
        'match__home_team__name',
        'match__away_team__name',
        'reported_by__email',
        'notes',
    )
    
    readonly_fields = (
        'created_at',
        'updated_at',
        'screenshot_preview'
    )
    
    fieldsets = (
        ('Partida', {
            'fields': ('match',)
        }),
        ('Súmula', {
            'fields': (
                'reported_by',
                'screenshot',
                'screenshot_preview',
                'notes'
            )
        }),
        ('Status', {
            'fields': (
                'status',
                'approved_by',
                'approved_at',
                'rejection_reason'
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
    
    raw_id_fields = ('match', 'reported_by', 'approved_by')
    
    actions = ['approve_reports', 'reject_reports']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('match', 'reported_by', 'approved_by')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def match_display(self, obj):
        """Exibe informações da partida."""
        return format_html(
            '<a href="/admin/fnc_matches/match/{}/change/">{}</a>',
            obj.match.id,
            str(obj.match)
        )
    match_display.short_description = 'Partida'
    
    def status_badge(self, obj):
        """Badge colorido para status da súmula."""
        colors = {
            'PENDING': '#ffc107',
            'SUBMITTED': '#17a2b8',
            'APPROVED': '#28a745',
            'REJECTED': '#dc3545'
        }
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
            '{}</span>',
            colors.get(obj.status, '#6c757d'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def reported_by_display(self, obj):
        """Quem reportou."""
        return format_html(
            '<a href="/admin/users/user/{}/change/">{}</a>',
            obj.reported_by.id,
            obj.reported_by.get_full_name() or obj.reported_by.email
        )
    reported_by_display.short_description = 'Reportado por'
    
    def approved_by_display(self, obj):
        """Quem aprovou."""
        if obj.approved_by:
            return format_html(
                '<a href="/admin/users/user/{}/change/">{}</a>',
                obj.approved_by.id,
                obj.approved_by.get_full_name() or obj.approved_by.email
            )
        return '-'
    approved_by_display.short_description = 'Aprovado por'
    
    def screenshot_preview(self, obj):
        """Preview do screenshot."""
        if obj.screenshot:
            return format_html(
                '<img src="{}" style="max-width: 400px; max-height: 300px;" />',
                obj.screenshot.url
            )
        return '-'
    screenshot_preview.short_description = 'Preview'
    
    # ========================================================================
    # AÇÕES
    # ========================================================================
    
    def approve_reports(self, request, queryset):
        """Aprova súmulas pendentes."""
        count = queryset.filter(status__in=['PENDING', 'SUBMITTED']).update(
            status='APPROVED',
            approved_by=request.user,
            approved_at=timezone.now()
        )
        self.message_user(
            request,
            f'{count} súmula(s) aprovada(s).'
        )
    approve_reports.short_description = 'Aprovar súmulas'
    
    def reject_reports(self, request, queryset):
        """Rejeita súmulas pendentes."""
        count = queryset.filter(status__in=['PENDING', 'SUBMITTED']).update(
            status='REJECTED'
        )
        self.message_user(
            request,
            f'{count} súmula(s) rejeitada(s). Não esqueça de adicionar o motivo.'
        )
    reject_reports.short_description = 'Rejeitar súmulas'


# ============================================================================
# GOAL ADMIN
# ============================================================================

@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
    """
    Admin para gerenciar gols.
    """
    
    list_display = (
        'match_display',
        'scorer_display',
        'team_display',
        'minute_display',
        'goal_type_badge',
        'assist_display'
    )
    
    list_filter = (
        'goal_type',
        'match__championship',
        'team',
    )
    
    search_fields = (
        'scorer__player_name',
        'scorer__gamer_tag',
        'match__home_team__name',
        'match__away_team__name',
    )
    
    readonly_fields = ('created_at', 'assist_display')
    
    raw_id_fields = ('match', 'scorer', 'team')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('match', 'scorer', 'team', 'scorer__user').prefetch_related('assist')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def match_display(self, obj):
        """Exibe a partida."""
        return format_html(
            '<a href="/admin/fnc_matches/match/{}/change/">{}</a>',
            obj.match.id,
            str(obj.match)
        )
    match_display.short_description = 'Partida'
    
    def scorer_display(self, obj):
        """Exibe o autor do gol."""
        return format_html(
            '<a href="/admin/users/playerprofile/{}/change/">{}</a>',
            obj.scorer.id,
            obj.scorer.player_name or obj.scorer.user.get_full_name()
        )
    scorer_display.short_description = 'Autor'
    
    def team_display(self, obj):
        """Exibe o time."""
        return format_html(
            '<a href="/admin/fnc_teams/team/{}/change/">{}</a>',
            obj.team.id,
            obj.team.name
        )
    team_display.short_description = 'Time'
    
    def minute_display(self, obj):
        """Exibe o minuto com destaque."""
        return format_html(
            '<span style="background-color: #007bff; color: white; '
            'padding: 2px 8px; border-radius: 3px; font-weight: bold;">'
            '{}\'</span>',
            obj.minute
        )
    minute_display.short_description = 'Minuto'
    
    def goal_type_badge(self, obj):
        """Badge para tipo de gol."""
        colors = {
            'REGULAR': '#28a745',
            'PENALTY': '#ffc107',
            'FREE_KICK': '#17a2b8',
            'HEADER': '#6610f2',
            'VOLLEY': '#e83e8c',
            'OWN_GOAL': '#dc3545'
        }
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px;">{}</span>',
            colors.get(obj.goal_type, '#6c757d'),
            obj.get_goal_type_display()
        )
    goal_type_badge.short_description = 'Tipo'
    
    def assist_display(self, obj):
        """Exibe a assistência se houver."""
        if hasattr(obj, 'assist'):
            return format_html(
                '🎯 <a href="/admin/users/playerprofile/{}/change/">{}</a>',
                obj.assist.assistant.id,
                obj.assist.assistant.player_name or obj.assist.assistant.user.get_full_name()
            )
        return '-'
    assist_display.short_description = 'Assistência'


# ============================================================================
# CARD ADMIN
# ============================================================================

@admin.register(Card)
class CardAdmin(admin.ModelAdmin):
    """
    Admin para gerenciar cartões.
    """
    
    list_display = (
        'match_display',
        'player_display',
        'team_display',
        'card_type_badge',
        'minute_display'
    )
    
    list_filter = (
        'card_type',
        'match__championship',
        'team',
    )
    
    search_fields = (
        'player__player_name',
        'player__gamer_tag',
        'match__home_team__name',
        'match__away_team__name',
        'reason',
    )
    
    readonly_fields = ('created_at',)
    
    raw_id_fields = ('match', 'player', 'team')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('match', 'player', 'team', 'player__user')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def match_display(self, obj):
        """Exibe a partida."""
        return format_html(
            '<a href="/admin/fnc_matches/match/{}/change/">{}</a>',
            obj.match.id,
            str(obj.match)
        )
    match_display.short_description = 'Partida'
    
    def player_display(self, obj):
        """Exibe o jogador."""
        return format_html(
            '<a href="/admin/users/playerprofile/{}/change/">{}</a>',
            obj.player.id,
            obj.player.player_name or obj.player.user.get_full_name()
        )
    player_display.short_description = 'Jogador'
    
    def team_display(self, obj):
        """Exibe o time."""
        return format_html(
            '<a href="/admin/fnc_teams/team/{}/change/">{}</a>',
            obj.team.id,
            obj.team.name
        )
    team_display.short_description = 'Time'
    
    def card_type_badge(self, obj):
        """Badge colorido para tipo de cartão."""
        colors = {
            'YELLOW': '#ffc107',
            'RED': '#dc3545'
        }
        icons = {
            'YELLOW': '🟨',
            'RED': '🟥'
        }
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
            '{} {}</span>',
            colors.get(obj.card_type, '#6c757d'),
            icons.get(obj.card_type, ''),
            obj.get_card_type_display()
        )
    card_type_badge.short_description = 'Cartão'
    
    def minute_display(self, obj):
        """Exibe o minuto."""
        return format_html(
            '<span style="font-weight: bold;">{}\'</span>',
            obj.minute
        )
    minute_display.short_description = 'Minuto'


# ============================================================================
# CONTESTATION ADMIN
# ============================================================================

@admin.register(Contestation)
class ContestationAdmin(admin.ModelAdmin):
    """
    Admin para gerenciar contestações de resultados.
    """
    
    list_display = (
        'match_display',
        'team_display',
        'reason_badge',
        'status_badge',
        'created_at'
    )
    
    list_filter = (
        'status',
        'reason',
        'created_at',
    )
    
    search_fields = (
        'match__home_team__name',
        'match__away_team__name',
        'team__name',
        'description',
    )
    
    readonly_fields = (
        'created_at',
        'updated_at',
        'evidence_preview'
    )
    
    fieldsets = (
        ('Contestação', {
            'fields': (
                'match',
                'team',
                'contested_by',
                'reason',
                'description'
            )
        }),
        ('Evidências', {
            'fields': (
                'evidence',
                'evidence_preview'
            )
        }),
        ('Status', {
            'fields': (
                'status',
                'response',
                'reviewed_by',
                'reviewed_at'
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
    
    raw_id_fields = ('match', 'team', 'contested_by', 'reviewed_by')
    
    actions = ['accept_contestations', 'reject_contestations', 'set_under_review']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('match', 'team', 'contested_by', 'reviewed_by')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def match_display(self, obj):
        """Exibe a partida."""
        return format_html(
            '<a href="/admin/fnc_matches/match/{}/change/">{}</a>',
            obj.match.id,
            str(obj.match)
        )
    match_display.short_description = 'Partida'
    
    def team_display(self, obj):
        """Exibe o time."""
        return format_html(
            '<a href="/admin/fnc_teams/team/{}/change/">{}</a>',
            obj.team.id,
            obj.team.name
        )
    team_display.short_description = 'Time'
    
    def reason_badge(self, obj):
        """Badge para o motivo."""
        colors = {
            'WRONG_SCORE': '#dc3545',
            'MISSING_PLAYER': '#ffc107',
            'FAKE_SCREENSHOT': '#dc3545',
            'OPPONENT_QUIT': '#ffc107',
            'CONNECTION_ISSUE': '#17a2b8',
            'OTHER': '#6c757d'
        }
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px;">{}</span>',
            colors.get(obj.reason, '#6c757d'),
            obj.get_reason_display()
        )
    reason_badge.short_description = 'Motivo'
    
    def status_badge(self, obj):
        """Badge para status."""
        colors = {
            'PENDING': '#ffc107',
            'UNDER_REVIEW': '#17a2b8',
            'ACCEPTED': '#28a745',
            'REJECTED': '#dc3545'
        }
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
            '{}</span>',
            colors.get(obj.status, '#6c757d'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def evidence_preview(self, obj):
        """Preview da evidência."""
        if obj.evidence:
            return format_html(
                '<img src="{}" style="max-width: 400px; max-height: 300px;" />',
                obj.evidence.url
            )
        return '-'
    evidence_preview.short_description = 'Preview da Evidência'
    
    # ========================================================================
    # AÇÕES
    # ========================================================================
    
    def accept_contestations(self, request, queryset):
        """Aceita contestações."""
        count = 0
        for contestation in queryset.exclude(status='ACCEPTED'):
            contestation.status = 'ACCEPTED'
            contestation.reviewed_by = request.user
            contestation.reviewed_at = timezone.now()
            contestation.save()
            
            # Marca a partida como contestada
            contestation.match.status = 'CONTESTED'
            contestation.match.save()
            count += 1
        
        self.message_user(
            request,
            f'{count} contestação(ões) aceita(s). As partidas foram marcadas como contestadas.'
        )
    accept_contestations.short_description = 'Aceitar contestações'
    
    def reject_contestations(self, request, queryset):
        """Rejeita contestações."""
        count = queryset.exclude(status__in=['ACCEPTED', 'REJECTED']).update(
            status='REJECTED',
            reviewed_by=request.user,
            reviewed_at=timezone.now()
        )
        self.message_user(
            request,
            f'{count} contestação(ões) rejeitada(s). Não esqueça de adicionar uma resposta.'
        )
    reject_contestations.short_description = 'Rejeitar contestações'
    
    def set_under_review(self, request, queryset):
        """Coloca contestações em análise."""
        count = queryset.filter(status='PENDING').update(
            status='UNDER_REVIEW'
        )
        self.message_user(
            request,
            f'{count} contestação(ões) em análise.'
        )
    set_under_review.short_description = 'Colocar em análise'


# ============================================================================
# ASSIST ADMIN (simples)
# ============================================================================

@admin.register(Assist)
class AssistAdmin(admin.ModelAdmin):
    """
    Admin simples para assistências.
    """
    
    list_display = ('goal', 'assistant_display', 'created_at')
    search_fields = ('assistant__player_name', 'assistant__gamer_tag')
    raw_id_fields = ('goal', 'assistant')
    readonly_fields = ('created_at',)
    
    def assistant_display(self, obj):
        """Exibe o assistente."""
        return format_html(
            '<a href="/admin/users/playerprofile/{}/change/">{}</a>',
            obj.assistant.id,
            obj.assistant.player_name or obj.assistant.user.get_full_name()
        )
    assistant_display.short_description = 'Assistente'


# ============================================================================
# MATCH PROPOSAL ADMIN
# ============================================================================

@admin.register(MatchProposal)
class MatchProposalAdmin(admin.ModelAdmin):
    """
    Admin para propostas de data de partida.
    """
    
    list_display = (
        'id',
        'match',
        'proposed_by_team',
        'proposed_date',
        'status',
        'created_at'
    )
    list_filter = ('status', 'created_at')
    search_fields = (
        'match__home_team__name',
        'match__away_team__name',
        'proposed_by_team__name'
    )
    raw_id_fields = ('match', 'proposed_by_team', 'responded_by')
    readonly_fields = ('created_at', 'updated_at', 'responded_at')
    
    fieldsets = (
        ('Informações da Proposta', {
            'fields': ('match', 'proposed_by_team', 'proposed_date', 'expires_at')
        }),
        ('Status', {
            'fields': ('status', 'response_message', 'responded_by', 'responded_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'


# ============================================================================
# MATCH CONFIRMATION ADMIN
# ============================================================================

@admin.register(MatchConfirmation)
class MatchConfirmationAdmin(admin.ModelAdmin):
    """
    Admin para confirmações de presença em partidas.
    """
    
    list_display = (
        'id',
        'match',
        'team',
        'status',
        'confirmation_deadline',
        'confirmed_at'
    )
    list_filter = ('status', 'confirmation_deadline')
    search_fields = ('match__home_team__name', 'match__away_team__name', 'team__name')
    raw_id_fields = ('match', 'team', 'confirmed_by')
    readonly_fields = ('created_at', 'updated_at', 'confirmed_at')
    
    fieldsets = (
        ('Informações da Confirmação', {
            'fields': ('match', 'team', 'confirmation_deadline')
        }),
        ('Status', {
            'fields': ('status', 'confirmed_by', 'confirmed_at', 'decline_reason')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    ordering = ('-created_at',)
    date_hierarchy = 'confirmation_deadline'


# ============================================================================
# PENALTY ADMIN
# ============================================================================

@admin.register(Penalty)
class PenaltyAdmin(admin.ModelAdmin):
    """
    Admin para penalidades.
    """
    
    list_display = (
        'id',
        'target_badge',
        'penalty_type_badge',
        'championship',
        'suspension_info',
        'status_badge',
        'applied_at'
    )
    list_filter = ('target_type', 'penalty_type', 'status', 'championship', 'applied_at')
    search_fields = (
        'player__player_name',
        'team__name',
        'reason',
        'notes'
    )
    raw_id_fields = (
        'player',
        'team',
        'match',
        'championship',
        'applied_by',
        'appeal_reviewed_by'
    )
    readonly_fields = ('applied_at', 'created_at', 'updated_at', 'is_suspended')
    
    fieldsets = (
        ('Alvo da Penalidade', {
            'fields': ('target_type', 'player', 'team')
        }),
        ('Detalhes da Penalidade', {
            'fields': ('penalty_type', 'reason', 'match', 'championship')
        }),
        ('Suspensão', {
            'fields': ('games_suspended', 'games_served', 'is_suspended')
        }),
        ('Multa', {
            'fields': ('fine_amount', 'fine_paid'),
            'classes': ('collapse',)
        }),
        ('Pontos', {
            'fields': ('points_deducted',),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('status', 'applied_by', 'applied_at')
        }),
        ('Recurso', {
            'fields': (
                'appeal_reason',
                'appeal_submitted_at',
                'appeal_reviewed_by',
                'appeal_reviewed_at',
                'appeal_decision'
            ),
            'classes': ('collapse',)
        }),
        ('Observações', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_served', 'activate_penalties', 'cancel_penalties']
    ordering = ('-applied_at',)
    date_hierarchy = 'applied_at'
    
    def target_badge(self, obj):
        """Badge do alvo."""
        if obj.target_type == 'PLAYER':
            icon = '👤'
            name = obj.player.player_name if obj.player else 'N/A'
        else:
            icon = '⚽'
            name = obj.team.name if obj.team else 'N/A'
        
        return format_html(
            '<span>{} {}</span>',
            icon,
            name
        )
    target_badge.short_description = 'Alvo'
    
    def penalty_type_badge(self, obj):
        """Badge do tipo de penalidade."""
        colors = {
            'WARNING': '#FFA500',
            'YELLOW_CARD': '#FFD700',
            'RED_CARD': '#DC143C',
            'WALKOVER': '#8B0000',
            'UNSPORTSMANLIKE': '#FF4500',
            'NO_SHOW': '#800000',
            'RULES_VIOLATION': '#B22222',
            'OTHER': '#696969'
        }
        color = colors.get(obj.penalty_type, '#000')
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_penalty_type_display()
        )
    penalty_type_badge.short_description = 'Tipo'
    
    def suspension_info(self, obj):
        """Informação de suspensão."""
        if obj.games_suspended > 0:
            remaining = obj.games_suspended - obj.games_served
            if remaining > 0:
                return format_html(
                    '<span style="color: red;">🚫 {}/{} jogos</span>',
                    obj.games_served,
                    obj.games_suspended
                )
            return format_html(
                '<span style="color: green;">✓ {}/{} jogos</span>',
                obj.games_served,
                obj.games_suspended
            )
        return '-'
    suspension_info.short_description = 'Suspensão'
    
    def status_badge(self, obj):
        """Badge de status."""
        colors = {
            'ACTIVE': 'red',
            'SERVED': 'green',
            'APPEALED': 'orange',
            'CANCELLED': 'gray'
        }
        color = colors.get(obj.status, 'black')
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def mark_as_served(self, request, queryset):
        """Marca penalidades como cumpridas."""
        count = queryset.update(
            status=Penalty.Status.SERVED,
            games_served=models.F('games_suspended')
        )
        self.message_user(request, f'{count} penalidade(s) marcada(s) como cumprida(s).')
    mark_as_served.short_description = 'Marcar como cumpridas'
    
    def activate_penalties(self, request, queryset):
        """Ativa penalidades."""
        count = queryset.filter(status='CANCELLED').update(status=Penalty.Status.ACTIVE)
        self.message_user(request, f'{count} penalidade(s) ativada(s).')
    activate_penalties.short_description = 'Ativar penalidades'
    
    def cancel_penalties(self, request, queryset):
        """Cancela penalidades."""
        count = queryset.exclude(status='SERVED').update(status=Penalty.Status.CANCELLED)
        self.message_user(request, f'{count} penalidade(s) cancelada(s).')
    cancel_penalties.short_description = 'Cancelar penalidades'


# ============================================================================
# PENALTY APPEAL ADMIN
# ============================================================================

@admin.register(PenaltyAppeal)
class PenaltyAppealAdmin(admin.ModelAdmin):
    """
    Admin para recursos de penalidades.
    """
    
    list_display = (
        'id',
        'penalty',
        'submitted_by',
        'status_badge',
        'created_at',
        'reviewed_at'
    )
    list_filter = ('status', 'created_at', 'reviewed_at')
    search_fields = ('penalty__reason', 'reason', 'decision', 'submitted_by__email')
    raw_id_fields = ('penalty', 'submitted_by', 'reviewed_by')
    readonly_fields = ('created_at', 'updated_at', 'reviewed_at')
    
    fieldsets = (
        ('Recurso', {
            'fields': ('penalty', 'submitted_by', 'reason', 'evidence')
        }),
        ('Análise', {
            'fields': ('status', 'reviewed_by', 'reviewed_at', 'decision')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['approve_appeals', 'reject_appeals', 'set_under_review']
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'
    
    def status_badge(self, obj):
        """Badge de status."""
        colors = {
            'PENDING': 'orange',
            'UNDER_REVIEW': 'blue',
            'APPROVED': 'green',
            'REJECTED': 'red'
        }
        color = colors.get(obj.status, 'black')
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def approve_appeals(self, request, queryset):
        """Aprova recursos."""
        count = 0
        for appeal in queryset.filter(status__in=['PENDING', 'UNDER_REVIEW']):
            appeal.status = PenaltyAppeal.Status.APPROVED
            appeal.reviewed_by = request.user
            appeal.reviewed_at = timezone.now()
            appeal.decision = 'Aprovado pelo administrador'
            appeal.save()
            
            # Cancelar penalidade
            penalty = appeal.penalty
            penalty.status = Penalty.Status.CANCELLED
            penalty.save()
            
            count += 1
        
        self.message_user(request, f'{count} recurso(s) aprovado(s).')
    approve_appeals.short_description = 'Aprovar recursos'
    
    def reject_appeals(self, request, queryset):
        """Rejeita recursos."""
        count = 0
        for appeal in queryset.filter(status__in=['PENDING', 'UNDER_REVIEW']):
            appeal.status = PenaltyAppeal.Status.REJECTED
            appeal.reviewed_by = request.user
            appeal.reviewed_at = timezone.now()
            appeal.decision = 'Rejeitado pelo administrador'
            appeal.save()
            
            # Manter penalidade ativa
            penalty = appeal.penalty
            penalty.status = Penalty.Status.ACTIVE
            penalty.save()
            
            count += 1
        
        self.message_user(request, f'{count} recurso(s) rejeitado(s).')
    reject_appeals.short_description = 'Rejeitar recursos'
    
    def set_under_review(self, request, queryset):
        """Coloca recursos em análise."""
        count = queryset.filter(status='PENDING').update(status=PenaltyAppeal.Status.UNDER_REVIEW)
        self.message_user(request, f'{count} recurso(s) em análise.')
    set_under_review.short_description = 'Colocar em análise'
