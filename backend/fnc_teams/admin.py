from django.contrib import admin
from django.core.exceptions import ValidationError
from django.utils.html import format_html
from django.utils import timezone
from .models import Team, TeamMembership, TeamInvitation, Formation, FormationPosition


# ============================================================================
# INLINE ADMINS
# ============================================================================

class TeamMembershipInline(admin.TabularInline):
    """
    Inline para gerenciar membros do time diretamente na página do time.
    """
    model = TeamMembership
    extra = 1
    fields = ('player', 'role', 'is_active', 'joined_at', 'left_at')
    readonly_fields = ('joined_at',)
    raw_id_fields = ('player',)
    verbose_name = 'Membro do Time'
    verbose_name_plural = 'Membros do Time'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('player', 'player__user')


class FormationInline(admin.TabularInline):
    """
    Inline para visualizar formações do time.
    """
    model = Formation
    extra = 0
    fields = ('name', 'schema', 'is_default', 'created_at')
    readonly_fields = ('created_at',)
    show_change_link = True
    verbose_name = 'Formação'
    verbose_name_plural = 'Formações'
    
    def has_add_permission(self, request, obj=None):
        # Permite adicionar formações na página do time
        return True


class FormationPositionInline(admin.TabularInline):
    """
    Inline para gerenciar posições dos jogadores na formação.
    """
    model = FormationPosition
    extra = 1
    fields = ('player', 'position', 'x_position', 'y_position')
    raw_id_fields = ('player',)
    verbose_name = 'Posição na Formação'
    verbose_name_plural = 'Posições na Formação'
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('player', 'player__user')


# ============================================================================
# TEAM ADMIN
# ============================================================================

@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    """
    Admin customizado para Times com estatísticas e gerenciamento de membros.
    """
    
    list_display = (
        'name',
        'abbreviation',
        'owner_display',
        'player_count_display',
        'status_badge',
        'championship_badge',
        'foundation_date',
        'created_at'
    )
    
    list_filter = (
        'is_active',
        'foundation_date',
        'created_at',
    )
    
    search_fields = (
        'name',
        'abbreviation',
        'owner__email',
        'owner__first_name',
        'owner__last_name',
        'description'
    )
    
    readonly_fields = (
        'foundation_date',
        'created_at',
        'updated_at',
        'player_count_display',
        'status_badge',
        'championship_badge'
    )
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': (
                'name',
                'abbreviation',
                'owner',
                'logo',
                'description'
            )
        }),
        ('Status', {
            'fields': (
                'is_active',
                'status_badge',
                'championship_badge',
                'player_count_display'
            )
        }),
        ('Datas', {
            'fields': (
                'foundation_date',
                'created_at',
                'updated_at'
            ),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [TeamMembershipInline, FormationInline]
    
    raw_id_fields = ('owner',)
    
    actions = ['activate_teams', 'deactivate_teams']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('owner').prefetch_related('players')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def owner_display(self, obj):
        """Exibe o dono do time com link."""
        return format_html(
            '<a href="/admin/users/user/{}/change/">{}</a>',
            obj.owner.id,
            obj.owner.get_full_name() or obj.owner.email
        )
    owner_display.short_description = 'Dono'
    
    def player_count_display(self, obj):
        """Exibe o número de jogadores ativos."""
        count = obj.player_count
        color = 'green' if count >= 11 else 'orange' if count >= 7 else 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} jogadores</span>',
            color,
            count
        )
    player_count_display.short_description = 'Jogadores'
    
    def status_badge(self, obj):
        """Badge colorido para status do time."""
        if obj.is_active:
            return format_html(
                '<span style="background-color: #28a745; color: white; '
                'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
                'ATIVO</span>'
            )
        else:
            return format_html(
                '<span style="background-color: #dc3545; color: white; '
                'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
                'INATIVO</span>'
            )
    status_badge.short_description = 'Status'
    
    def championship_badge(self, obj):
        """Badge indicando se o time tem campeonato ativo."""
        if obj.has_active_championship:
            return format_html(
                '<span style="background-color: #007bff; color: white; '
                'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
                '📊 CAMPEONATO ATIVO</span>'
            )
        else:
            return format_html(
                '<span style="background-color: #6c757d; color: white; '
                'padding: 3px 10px; border-radius: 3px;">'
                'Sem campeonato</span>'
            )
    championship_badge.short_description = 'Campeonato'
    
    # ========================================================================
    # AÇÕES
    # ========================================================================
    
    def activate_teams(self, request, queryset):
        """Ativa times selecionados."""
        count = queryset.update(is_active=True)
        self.message_user(
            request,
            f'{count} time(s) ativado(s) com sucesso.'
        )
    activate_teams.short_description = 'Ativar times selecionados'
    
    def deactivate_teams(self, request, queryset):
        """Desativa times selecionados."""
        count = queryset.update(is_active=False)
        self.message_user(
            request,
            f'{count} time(s) desativado(s) com sucesso.'
        )
    deactivate_teams.short_description = 'Desativar times selecionados'


# ============================================================================
# TEAM MEMBERSHIP ADMIN
# ============================================================================

@admin.register(TeamMembership)
class TeamMembershipAdmin(admin.ModelAdmin):
    """
    Admin para gerenciar membros dos times.
    """
    
    list_display = (
        'player_name',
        'team_name',
        'role_badge',
        'status_badge',
        'joined_at',
        'left_at'
    )
    
    list_filter = (
        'role',
        'is_active',
        'joined_at',
    )
    
    search_fields = (
        'player__user__email',
        'player__user__first_name',
        'player__user__last_name',
        'team__name',
    )
    
    readonly_fields = ('joined_at',)
    
    raw_id_fields = ('team', 'player')
    
    actions = ['activate_memberships', 'deactivate_memberships', 'promote_to_captain']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('team', 'player', 'player__user')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def player_name(self, obj):
        """Nome do jogador com link."""
        return format_html(
            '<a href="/admin/users/playerprofile/{}/change/">{}</a>',
            obj.player.id,
            obj.player.user.get_full_name() or obj.player.user.email
        )
    player_name.short_description = 'Jogador'
    
    def team_name(self, obj):
        """Nome do time com link."""
        return format_html(
            '<a href="/admin/fnc_teams/team/{}/change/">{}</a>',
            obj.team.id,
            obj.team.name
        )
    team_name.short_description = 'Time'
    
    def role_badge(self, obj):
        """Badge colorido para função."""
        colors = {
            'OWNER': '#dc3545',
            'CAPTAIN': '#ffc107',
            'PLAYER': '#28a745'
        }
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
            '{}</span>',
            colors.get(obj.role, '#6c757d'),
            obj.get_role_display()
        )
    role_badge.short_description = 'Função'
    
    def status_badge(self, obj):
        """Badge colorido para status."""
        if obj.is_active:
            return format_html(
                '<span style="background-color: #28a745; color: white; '
                'padding: 3px 10px; border-radius: 3px;">ATIVO</span>'
            )
        else:
            return format_html(
                '<span style="background-color: #dc3545; color: white; '
                'padding: 3px 10px; border-radius: 3px;">INATIVO</span>'
            )
    status_badge.short_description = 'Status'
    
    # ========================================================================
    # AÇÕES
    # ========================================================================
    
    def activate_memberships(self, request, queryset):
        """Ativa membros selecionados."""
        count = queryset.update(is_active=True, left_at=None)
        self.message_user(
            request,
            f'{count} membro(s) ativado(s) com sucesso.'
        )
    activate_memberships.short_description = 'Ativar membros selecionados'
    
    def deactivate_memberships(self, request, queryset):
        """Desativa membros selecionados."""
        count = queryset.update(is_active=False, left_at=timezone.now())
        self.message_user(
            request,
            f'{count} membro(s) desativado(s) com sucesso.'
        )
    deactivate_memberships.short_description = 'Desativar membros selecionados'
    
    def promote_to_captain(self, request, queryset):
        """Promove jogadores a capitão."""
        count = queryset.filter(role='PLAYER').update(role='CAPTAIN')
        self.message_user(
            request,
            f'{count} jogador(es) promovido(s) a capitão.'
        )
    promote_to_captain.short_description = 'Promover a capitão'


# ============================================================================
# TEAM INVITATION ADMIN
# ============================================================================

@admin.register(TeamInvitation)
class TeamInvitationAdmin(admin.ModelAdmin):
    """
    Admin para gerenciar convites de times.
    """
    
    list_display = (
        'team_name',
        'player_name',
        'invited_by_display',
        'status_badge',
        'created_at',
        'responded_at'
    )
    
    list_filter = (
        'status',
        'created_at',
        'responded_at',
    )
    
    search_fields = (
        'team__name',
        'player__user__email',
        'player__user__first_name',
        'player__user__last_name',
        'invited_by__email',
    )
    
    readonly_fields = ('created_at', 'responded_at')
    
    raw_id_fields = ('team', 'player', 'invited_by')
    
    actions = ['accept_invitations', 'decline_invitations', 'cancel_invitations']
    
    fieldsets = (
        ('Convite', {
            'fields': (
                'team',
                'player',
                'invited_by',
                'message'
            )
        }),
        ('Status', {
            'fields': (
                'status',
                'created_at',
                'responded_at'
            )
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('team', 'player', 'player__user', 'invited_by')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def team_name(self, obj):
        """Nome do time com link."""
        return format_html(
            '<a href="/admin/fnc_teams/team/{}/change/">{}</a>',
            obj.team.id,
            obj.team.name
        )
    team_name.short_description = 'Time'
    
    def player_name(self, obj):
        """Nome do jogador com link."""
        return format_html(
            '<a href="/admin/users/playerprofile/{}/change/">{}</a>',
            obj.player.id,
            obj.player.user.get_full_name() or obj.player.user.email
        )
    player_name.short_description = 'Jogador'
    
    def invited_by_display(self, obj):
        """Quem enviou o convite."""
        return format_html(
            '<a href="/admin/users/user/{}/change/">{}</a>',
            obj.invited_by.id,
            obj.invited_by.get_full_name() or obj.invited_by.email
        )
    invited_by_display.short_description = 'Convidado por'
    
    def status_badge(self, obj):
        """Badge colorido para status."""
        colors = {
            'PENDING': '#ffc107',
            'ACCEPTED': '#28a745',
            'DECLINED': '#dc3545',
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
    
    # ========================================================================
    # AÇÕES
    # ========================================================================
    
    def accept_invitations(self, request, queryset):
        """Aceita convites pendentes."""
        pending = queryset.filter(status='PENDING')
        count = 0
        blocked = 0
        
        for invitation in pending:
            try:
                # Aceita o convite
                invitation.status = 'ACCEPTED'
                invitation.responded_at = timezone.now()
                invitation.save()

                # Cria o membership
                TeamMembership.objects.get_or_create(
                    team=invitation.team,
                    player=invitation.player,
                    defaults={'role': TeamMembership.Role.PLAYER}
                )
                count += 1
            except ValidationError:
                invitation.status = 'PENDING'
                invitation.responded_at = None
                invitation.save(update_fields=['status', 'responded_at'])
                blocked += 1
        
        message = f'{count} convite(s) aceito(s) e jogador(es) adicionado(s) ao time.'
        if blocked:
            message += f' {blocked} convite(s) permaneceram pendentes porque o time já atingiu o limite máximo de 25 jogadores.'

        self.message_user(request, message)
    accept_invitations.short_description = 'Aceitar convites selecionados'
    
    def decline_invitations(self, request, queryset):
        """Recusa convites pendentes."""
        count = queryset.filter(status='PENDING').update(
            status='DECLINED',
            responded_at=timezone.now()
        )
        self.message_user(
            request,
            f'{count} convite(s) recusado(s).'
        )
    decline_invitations.short_description = 'Recusar convites selecionados'
    
    def cancel_invitations(self, request, queryset):
        """Cancela convites pendentes."""
        count = queryset.filter(status='PENDING').update(
            status='CANCELLED',
            responded_at=timezone.now()
        )
        self.message_user(
            request,
            f'{count} convite(s) cancelado(s).'
        )
    cancel_invitations.short_description = 'Cancelar convites selecionados'


# ============================================================================
# FORMATION ADMIN
# ============================================================================

@admin.register(Formation)
class FormationAdmin(admin.ModelAdmin):
    """
    Admin para gerenciar formações táticas dos times.
    """
    
    list_display = (
        'name',
        'team_name',
        'schema_badge',
        'default_badge',
        'position_count',
        'created_at'
    )
    
    list_filter = (
        'schema',
        'is_default',
        'created_at',
    )
    
    search_fields = (
        'name',
        'team__name',
    )
    
    readonly_fields = ('created_at', 'updated_at', 'position_count')
    
    raw_id_fields = ('team',)
    
    fieldsets = (
        ('Informações da Formação', {
            'fields': (
                'team',
                'name',
                'schema',
                'is_default'
            )
        }),
        ('Estatísticas', {
            'fields': ('position_count',)
        }),
        ('Datas', {
            'fields': (
                'created_at',
                'updated_at'
            ),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [FormationPositionInline]
    
    actions = ['set_as_default']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('team').prefetch_related('positions')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def team_name(self, obj):
        """Nome do time com link."""
        return format_html(
            '<a href="/admin/fnc_teams/team/{}/change/">{}</a>',
            obj.team.id,
            obj.team.name
        )
    team_name.short_description = 'Time'
    
    def schema_badge(self, obj):
        """Badge para o esquema tático."""
        return format_html(
            '<span style="background-color: #007bff; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
            '{}</span>',
            obj.schema
        )
    schema_badge.short_description = 'Esquema'
    
    def default_badge(self, obj):
        """Badge indicando se é formação padrão."""
        if obj.is_default:
            return format_html(
                '<span style="background-color: #28a745; color: white; '
                'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
                '⭐ PADRÃO</span>'
            )
        else:
            return format_html(
                '<span style="background-color: #6c757d; color: white; '
                'padding: 3px 10px; border-radius: 3px;">'
                'Alternativa</span>'
            )
    default_badge.short_description = 'Tipo'
    
    def position_count(self, obj):
        """Número de posições preenchidas."""
        count = obj.positions.count()
        color = 'green' if count == 11 else 'orange' if count >= 7 else 'red'
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}/11 posições</span>',
            color,
            count
        )
    position_count.short_description = 'Posições'
    
    # ========================================================================
    # AÇÕES
    # ========================================================================
    
    def set_as_default(self, request, queryset):
        """Define formação como padrão."""
        if queryset.count() != 1:
            self.message_user(
                request,
                'Selecione apenas UMA formação para definir como padrão.',
                level='error'
            )
            return
        
        formation = queryset.first()
        # Remove padrão de outras formações
        Formation.objects.filter(team=formation.team).update(is_default=False)
        # Define esta como padrão
        formation.is_default = True
        formation.save()
        
        self.message_user(
            request,
            f'Formação "{formation.name}" definida como padrão para {formation.team.name}.'
        )
    set_as_default.short_description = 'Definir como formação padrão'


# ============================================================================
# FORMATION POSITION ADMIN
# ============================================================================

@admin.register(FormationPosition)
class FormationPositionAdmin(admin.ModelAdmin):
    """
    Admin para gerenciar posições individuais nas formações.
    """
    
    list_display = (
        'player_name',
        'formation_display',
        'position_badge',
        'coordinates_display'
    )
    
    list_filter = (
        'position',
        'formation__schema',
    )
    
    search_fields = (
        'player__user__email',
        'player__user__first_name',
        'player__user__last_name',
        'formation__name',
        'formation__team__name',
        'position'
    )
    
    raw_id_fields = ('formation', 'player')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('formation', 'formation__team', 'player', 'player__user')
    
    # ========================================================================
    # MÉTODOS DE EXIBIÇÃO
    # ========================================================================
    
    def player_name(self, obj):
        """Nome do jogador com link."""
        return format_html(
            '<a href="/admin/users/playerprofile/{}/change/">{}</a>',
            obj.player.id,
            obj.player.user.get_full_name() or obj.player.user.email
        )
    player_name.short_description = 'Jogador'
    
    def formation_display(self, obj):
        """Formação com link."""
        return format_html(
            '<a href="/admin/fnc_teams/formation/{}/change/">{} ({})</a>',
            obj.formation.id,
            obj.formation.name,
            obj.formation.team.name
        )
    formation_display.short_description = 'Formação'
    
    def position_badge(self, obj):
        """Badge para a posição."""
        # Cores baseadas na posição
        colors = {
            'GK': '#dc3545',    # Goleiro - vermelho
            'ST': '#28a745',    # Atacante - verde
            'CF': '#28a745',
            'LW': '#ffc107',    # Pontas - amarelo
            'RW': '#ffc107',
            'CAM': '#17a2b8',   # Meio-campo - azul claro
            'CM': '#17a2b8',
            'CDM': '#007bff',   # Volante - azul
            'LB': '#6610f2',    # Laterais - roxo
            'RB': '#6610f2',
            'CB': '#6c757d',    # Zagueiros - cinza
            'LWB': '#e83e8c',   # Alas - rosa
            'RWB': '#e83e8c',
        }
        color = colors.get(obj.position.upper(), '#6c757d')
        
        return format_html(
            '<span style="background-color: {}; color: white; '
            'padding: 3px 10px; border-radius: 3px; font-weight: bold;">'
            '{}</span>',
            color,
            obj.position
        )
    position_badge.short_description = 'Posição'
    
    def coordinates_display(self, obj):
        """Exibe as coordenadas."""
        return format_html(
            '<span style="font-family: monospace;">X: {:.1f}% | Y: {:.1f}%</span>',
            obj.x_position,
            obj.y_position
        )
    coordinates_display.short_description = 'Coordenadas'
