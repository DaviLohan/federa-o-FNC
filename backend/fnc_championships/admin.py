from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Championship, ChampionshipEnrollment, ChampionshipPrize, Bracket, Standings


# ============================================================================
# INLINE ADMINS
# ============================================================================

class ChampionshipEnrollmentInline(admin.TabularInline):
    """
    Inline para gerenciar inscrições de times no campeonato.
    """
    model = ChampionshipEnrollment
    extra = 0
    fields = ('team', 'status', 'payment_status', 'enrolled_at', 'approved_at')
    readonly_fields = ('enrolled_at', 'approved_at')
    raw_id_fields = ('team',)
    verbose_name = 'Inscrição'
    verbose_name_plural = 'Inscrições'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('team')


class ChampionshipPrizeInline(admin.TabularInline):
    """
    Inline para gerenciar premiações do campeonato.
    """
    model = ChampionshipPrize
    extra = 1
    fields = ('position', 'amount', 'description', 'winner_team')
    raw_id_fields = ('winner_team',)
    verbose_name = 'Premiação'
    verbose_name_plural = 'Premiações'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('winner_team')


class StandingsInline(admin.TabularInline):
    """
    Inline para visualizar classificação (pontos corridos).
    """
    model = Standings
    extra = 0
    fields = ('team', 'matches_played', 'wins', 'draws', 'losses', 'goals_for', 'goals_against', 'points')
    readonly_fields = ('team', 'matches_played', 'wins', 'draws', 'losses', 'goals_for', 'goals_against', 'points')
    verbose_name = 'Classificação'
    verbose_name_plural = 'Tabela de Classificação'
    
    def has_add_permission(self, request, obj=None):
        # Classificação é calculada automaticamente
        return False
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('team')


# ============================================================================
# CHAMPIONSHIP ADMIN
# ============================================================================

@admin.register(Championship)
class ChampionshipAdmin(admin.ModelAdmin):
    """
    Admin customizado para Campeonatos com gerenciamento completo.
    """
    
    list_display = (
        'name',
        'championship_type_badge',
        'status_badge',
        'enrollment_badge',
        'teams_count_display',
        'prize_display',
        'start_date',
        'created_at'
    )
    
    list_filter = (
        'championship_type',
        'status',
        'start_date',
        'created_at',
    )
    
    search_fields = (
        'name',
        'description',
        'created_by__email',
    )
    
    readonly_fields = (
        'created_at',
        'updated_at',
        'teams_count_display',
        'enrollment_badge',
        'status_badge'
    )
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': (
                'name',
                'description',
                'rules',
                'banner',
                'created_by'
            )
        }),
        ('Configuração do Campeonato', {
            'fields': (
                'championship_type',
                'group_stage_format',
                'status',
                'min_teams',
                'max_teams',
                'number_of_winners'
            )
        }),
        ('Datas', {
            'fields': (
                'enrollment_start',
                'enrollment_end',
                'start_date',
                'end_date'
            )
        }),
        ('Valores', {
            'fields': (
                'enrollment_fee',
                'prize_pool'
            )
        }),
        ('Estatísticas', {
            'fields': (
                'teams_count_display',
                'enrollment_badge'
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
    
    inlines = [ChampionshipEnrollmentInline, ChampionshipPrizeInline, StandingsInline]
    
    raw_id_fields = ('created_by',)
    
    actions = [
        'open_enrollments',
        'close_enrollments',
        'start_championships',
        'finish_championships',
        'cancel_championships'
    ]
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('created_by').prefetch_related('enrollments')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def championship_type_badge(self, obj):
        """Badge colorido para tipo de campeonato."""
        colors = {
            'KNOCKOUT': '#dc3545',
            'LEAGUE': '#007bff'
        }
        icons = {
            'KNOCKOUT': '🏆',
            'LEAGUE': '📊'
        }
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
            '{} {}</span>',
            colors.get(obj.championship_type, '#6c757d'),
            icons.get(obj.championship_type, ''),
            obj.get_championship_type_display()
        )
    championship_type_badge.short_description = 'Tipo'
    
    def status_badge(self, obj):
        """Badge colorido para status do campeonato."""
        colors = {
            'PENDING': '#6c757d',
            'OPEN': '#28a745',
            'IN_PROGRESS': '#007bff',
            'FINISHED': '#ffc107',
            'CANCELLED': '#dc3545'
        }
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
            '{}</span>',
            colors.get(obj.status, '#6c757d'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def enrollment_badge(self, obj):
        """Badge indicando se inscrições estão abertas."""
        if obj.is_enrollment_open:
            return format_html(
                '<span style="background-color: #28a745; color: white; '
                'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
                '✅ INSCRIÇÕES ABERTAS</span>'
            )
        else:
            return format_html(
                '<span style="background-color: #6c757d; color: white; '
                'padding: 3px 10px; border-radius: 3px;">'
                'Inscrições fechadas</span>'
            )
    enrollment_badge.short_description = 'Inscrições'
    
    def teams_count_display(self, obj):
        """Exibe o número de times inscritos."""
        count = obj.enrolled_teams_count
        max_teams = obj.max_teams or '∞'
        
        # Define cor baseada na ocupação
        if obj.max_teams:
            percentage = (count / obj.max_teams) * 100
            color = 'green' if percentage >= 80 else 'orange' if percentage >= 50 else 'red'
        else:
            color = 'green' if count >= obj.min_teams else 'red'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} / {} times</span>',
            color,
            count,
            max_teams
        )
    teams_count_display.short_description = 'Times Inscritos'
    
    def prize_display(self, obj):
        """Exibe o valor da premiação."""
        if obj.prize_pool > 0:
            return format_html(
                '<span style="color: #28a745; font-weight: bold;">R$ {:.2f}</span>',
                obj.prize_pool
            )
        return '-'
    prize_display.short_description = 'Premiação'
    
    # ========================================================================
    # AÇÕES
    # ========================================================================
    
    def open_enrollments(self, request, queryset):
        """Abre inscrições dos campeonatos selecionados."""
        count = queryset.filter(status='PENDING').update(status='OPEN')
        self.message_user(
            request,
            f'{count} campeonato(s) com inscrições abertas.'
        )
    open_enrollments.short_description = 'Abrir inscrições'
    
    def close_enrollments(self, request, queryset):
        """Fecha inscrições (mas não inicia o campeonato)."""
        count = 0
        for championship in queryset.filter(status='OPEN'):
            if championship.enrolled_teams_count >= championship.min_teams:
                championship.status = 'PENDING'
                championship.save()
                count += 1
        
        self.message_user(
            request,
            f'{count} campeonato(s) com inscrições fechadas. Pode iniciar quando quiser.'
        )
    close_enrollments.short_description = 'Fechar inscrições'
    
    def start_championships(self, request, queryset):
        """Inicia campeonatos selecionados."""
        count = 0
        errors = []
        
        for championship in queryset.exclude(status='IN_PROGRESS'):
            if championship.enrolled_teams_count < championship.min_teams:
                errors.append(f'{championship.name}: mínimo de times não atingido')
                continue
            
            championship.status = 'IN_PROGRESS'
            championship.save()
            count += 1
        
        if count:
            self.message_user(
                request,
                f'{count} campeonato(s) iniciado(s) com sucesso.'
            )
        
        if errors:
            self.message_user(
                request,
                f'Erros: {"; ".join(errors)}',
                level='error'
            )
    start_championships.short_description = 'Iniciar campeonatos'
    
    def finish_championships(self, request, queryset):
        """Finaliza campeonatos em andamento."""
        count = queryset.filter(status='IN_PROGRESS').update(
            status='FINISHED',
            end_date=timezone.now()
        )
        self.message_user(
            request,
            f'{count} campeonato(s) finalizado(s).'
        )
    finish_championships.short_description = 'Finalizar campeonatos'
    
    def cancel_championships(self, request, queryset):
        """Cancela campeonatos."""
        count = queryset.exclude(status__in=['FINISHED', 'CANCELLED']).update(
            status='CANCELLED'
        )
        self.message_user(
            request,
            f'{count} campeonato(s) cancelado(s).'
        )
    cancel_championships.short_description = 'Cancelar campeonatos'


# ============================================================================
# CHAMPIONSHIP ENROLLMENT ADMIN
# ============================================================================

@admin.register(ChampionshipEnrollment)
class ChampionshipEnrollmentAdmin(admin.ModelAdmin):
    """
    Admin para gerenciar inscrições de times em campeonatos.
    """
    
    list_display = (
        'championship_name',
        'team_name',
        'status_badge',
        'payment_badge',
        'enrolled_at',
        'approved_at'
    )
    
    list_filter = (
        'status',
        'payment_status',
        'enrolled_at',
        'approved_at',
    )
    
    search_fields = (
        'championship__name',
        'team__name',
        'payment_id',
    )
    
    readonly_fields = ('enrolled_at', 'approved_at')
    
    raw_id_fields = ('championship', 'team')
    
    actions = ['approve_enrollments', 'reject_enrollments', 'cancel_enrollments']
    
    fieldsets = (
        ('Inscrição', {
            'fields': (
                'championship',
                'team',
                'status'
            )
        }),
        ('Pagamento', {
            'fields': (
                'payment_status',
                'payment_id'
            )
        }),
        ('Datas', {
            'fields': (
                'enrolled_at',
                'approved_at'
            ),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('championship', 'team')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def championship_name(self, obj):
        """Nome do campeonato com link."""
        return format_html(
            '<a href="/admin/fnc_championships/championship/{}/change/">{}</a>',
            obj.championship.id,
            obj.championship.name
        )
    championship_name.short_description = 'Campeonato'
    
    def team_name(self, obj):
        """Nome do time com link."""
        return format_html(
            '<a href="/admin/fnc_teams/team/{}/change/">{}</a>',
            obj.team.id,
            obj.team.name
        )
    team_name.short_description = 'Time'
    
    def status_badge(self, obj):
        """Badge colorido para status da inscrição."""
        colors = {
            'PENDING': '#ffc107',
            'APPROVED': '#28a745',
            'REJECTED': '#dc3545',
            'CANCELLED': '#6c757d'
        }
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
            '{}</span>',
            colors.get(obj.status, '#6c757d'),
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    def payment_badge(self, obj):
        """Badge para status do pagamento."""
        colors = {
            'PENDING': '#ffc107',
            'PAID': '#28a745',
            'FAILED': '#dc3545'
        }
        labels = {
            'PENDING': 'Pendente',
            'PAID': 'Pago',
            'FAILED': 'Falhou'
        }
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px;">{}</span>',
            colors.get(obj.payment_status, '#6c757d'),
            labels.get(obj.payment_status, obj.payment_status)
        )
    payment_badge.short_description = 'Pagamento'
    
    # ========================================================================
    # AÇÕES
    # ========================================================================
    
    def approve_enrollments(self, request, queryset):
        """Aprova inscrições pendentes."""
        count = queryset.filter(status='PENDING').update(
            status='APPROVED',
            approved_at=timezone.now()
        )
        self.message_user(
            request,
            f'{count} inscrição(ões) aprovada(s).'
        )
    approve_enrollments.short_description = 'Aprovar inscrições'
    
    def reject_enrollments(self, request, queryset):
        """Rejeita inscrições pendentes."""
        count = queryset.filter(status='PENDING').update(status='REJECTED')
        self.message_user(
            request,
            f'{count} inscrição(ões) rejeitada(s).'
        )
    reject_enrollments.short_description = 'Rejeitar inscrições'
    
    def cancel_enrollments(self, request, queryset):
        """Cancela inscrições."""
        count = queryset.filter(status__in=['PENDING', 'APPROVED']).update(
            status='CANCELLED'
        )
        self.message_user(
            request,
            f'{count} inscrição(ões) cancelada(s).'
        )
    cancel_enrollments.short_description = 'Cancelar inscrições'


# ============================================================================
# CHAMPIONSHIP PRIZE ADMIN
# ============================================================================

@admin.register(ChampionshipPrize)
class ChampionshipPrizeAdmin(admin.ModelAdmin):
    """
    Admin para gerenciar premiações dos campeonatos.
    """
    
    list_display = (
        'championship_name',
        'position_badge',
        'amount_display',
        'winner_display',
        'description'
    )
    
    list_filter = (
        'position',
        'championship__championship_type',
    )
    
    search_fields = (
        'championship__name',
        'description',
        'winner_team__name',
    )
    
    raw_id_fields = ('championship', 'winner_team')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('championship', 'winner_team')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def championship_name(self, obj):
        """Nome do campeonato com link."""
        return format_html(
            '<a href="/admin/fnc_championships/championship/{}/change/">{}</a>',
            obj.championship.id,
            obj.championship.name
        )
    championship_name.short_description = 'Campeonato'
    
    def position_badge(self, obj):
        """Badge colorido para posição."""
        colors = {
            1: '#FFD700',  # Ouro
            2: '#C0C0C0',  # Prata
            3: '#CD7F32',  # Bronze
        }
        color = colors.get(obj.position, '#007bff')
        
        medals = {
            1: '🥇',
            2: '🥈',
            3: '🥉'
        }
        medal = medals.get(obj.position, '🏆')
        
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
            '{} {}º Lugar</span>',
            color,
            medal,
            obj.position
        )
    position_badge.short_description = 'Posição'
    
    def amount_display(self, obj):
        """Valor formatado da premiação."""
        return format_html(
            '<span style="color: #28a745; font-weight: bold;">R$ {:.2f}</span>',
            obj.amount
        )
    amount_display.short_description = 'Valor'
    
    def winner_display(self, obj):
        """Exibe o time vencedor se houver."""
        if obj.winner_team:
            return format_html(
                '<a href="/admin/fnc_teams/team/{}/change/">{}</a>',
                obj.winner_team.id,
                obj.winner_team.name
            )
        return format_html(
            '<span style="color: #6c757d;">A definir</span>'
        )
    winner_display.short_description = 'Vencedor'


# ============================================================================
# BRACKET ADMIN
# ============================================================================

@admin.register(Bracket)
class BracketAdmin(admin.ModelAdmin):
    """
    Admin para gerenciar chaveamentos (mata-mata).
    """
    
    list_display = (
        'championship_name',
        'created_at',
        'updated_at'
    )
    
    search_fields = (
        'championship__name',
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    raw_id_fields = ('championship',)
    
    fieldsets = (
        ('Campeonato', {
            'fields': ('championship',)
        }),
        ('Estrutura do Chaveamento', {
            'fields': ('structure',),
            'description': 'Estrutura JSON do chaveamento mata-mata'
        }),
        ('Datas', {
            'fields': (
                'created_at',
                'updated_at'
            ),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('championship')
    
    def championship_name(self, obj):
        """Nome do campeonato com link."""
        return format_html(
            '<a href="/admin/fnc_championships/championship/{}/change/">{}</a>',
            obj.championship.id,
            obj.championship.name
        )
    championship_name.short_description = 'Campeonato'


# ============================================================================
# STANDINGS ADMIN
# ============================================================================

@admin.register(Standings)
class StandingsAdmin(admin.ModelAdmin):
    """
    Admin para gerenciar classificação (pontos corridos).
    """
    
    list_display = (
        'position_display',
        'team_name',
        'championship_name',
        'matches_played',
        'points_display',
        'wins',
        'draws',
        'losses',
        'goal_difference_display'
    )
    
    list_filter = (
        'championship',
    )
    
    search_fields = (
        'team__name',
        'championship__name',
    )
    
    readonly_fields = ('updated_at',)
    
    raw_id_fields = ('championship', 'team')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('championship', 'team')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def position_display(self, obj):
        """Posição do time na tabela."""
        # Calcula a posição baseada na ordenação
        standings = Standings.objects.filter(
            championship=obj.championship
        ).order_by('-points', '-wins', '-goals_for')
        
        position = list(standings.values_list('id', flat=True)).index(obj.id) + 1
        
        # Define cor baseada na posição
        if position <= 3:
            color = '#28a745'  # Verde
        elif position <= 8:
            color = '#007bff'  # Azul
        else:
            color = '#6c757d'  # Cinza
        
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
            '{}º</span>',
            color,
            position
        )
    position_display.short_description = 'Pos'
    
    def championship_name(self, obj):
        """Nome do campeonato com link."""
        return format_html(
            '<a href="/admin/fnc_championships/championship/{}/change/">{}</a>',
            obj.championship.id,
            obj.championship.name
        )
    championship_name.short_description = 'Campeonato'
    
    def team_name(self, obj):
        """Nome do time com link."""
        return format_html(
            '<a href="/admin/fnc_teams/team/{}/change/">{}</a>',
            obj.team.id,
            obj.team.name
        )
    team_name.short_description = 'Time'
    
    def points_display(self, obj):
        """Pontos com destaque."""
        return format_html(
            '<span style="color: #007bff; font-weight: bold; font-size: 14px;">{}</span>',
            obj.points
        )
    points_display.short_description = 'Pts'
    points_display.admin_order_field = 'points'
    
    def goal_difference_display(self, obj):
        """Saldo de gols com cor."""
        diff = obj.goal_difference
        color = 'green' if diff > 0 else 'red' if diff < 0 else 'gray'
        sign = '+' if diff > 0 else ''
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}{}</span>',
            color,
            sign,
            diff
        )
    goal_difference_display.short_description = 'SG'
