from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User, PlayerProfile, TeamOwnerProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin customizado para o modelo User."""
    
    list_display = [
        'email', 
        'get_full_name_display', 
        'user_type_badge', 
        'platform',
        'is_active',
        'date_joined'
    ]
    
    list_filter = [
        'user_type',
        'platform',
        'is_active',
        'is_staff',
        'is_superuser',
        'date_joined'
    ]
    
    search_fields = [
        'email',
        'first_name',
        'last_name'
    ]
    
    ordering = ['-date_joined']
    
    readonly_fields = [
        'date_joined',
        'last_login',
        'get_profile_link'
    ]
    
    fieldsets = (
        (None, {
            'fields': ('email', 'password')
        }),
        ('Informações Pessoais', {
            'fields': ('first_name', 'last_name', 'platform')
        }),
        ('Tipo de Usuário', {
            'fields': ('user_type', 'get_profile_link')
        }),
        ('Permissões', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
            'classes': ('collapse',)
        }),
        ('Datas Importantes', {
            'fields': ('date_joined', 'last_login'),
            'classes': ('collapse',)
        }),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'platform', 'password1', 'password2'),
        }),
    )
    
    actions = ['activate_users', 'deactivate_users', 'convert_to_team_owner']
    
    def get_full_name_display(self, obj):
        """Exibe o nome completo do usuário."""
        return obj.full_name
    get_full_name_display.short_description = 'Nome Completo'
    
    def user_type_badge(self, obj):
        """Exibe o tipo de usuário com badge colorido."""
        colors = {
            'PLAYER': '#28a745',
            'TEAM_OWNER': '#007bff',
            'ADMIN': '#dc3545'
        }
        color = colors.get(obj.user_type, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; '
            'border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_user_type_display()
        )
    user_type_badge.short_description = 'Tipo'
    
    def get_profile_link(self, obj):
        """Link para o perfil correspondente."""
        if obj.user_type == 'PLAYER' and hasattr(obj, 'player_profile'):
            return format_html(
                '<a href="/admin/users/playerprofile/{}/change/">Ver Perfil de Jogador</a>',
                obj.player_profile.id
            )
        elif obj.user_type == 'TEAM_OWNER' and hasattr(obj, 'team_owner_profile'):
            return format_html(
                '<a href="/admin/users/teamownerprofile/{}/change/">Ver Perfil de Dono</a>',
                obj.team_owner_profile.id
            )
        return '-'
    get_profile_link.short_description = 'Perfil'
    
    @admin.action(description='Ativar usuários selecionados')
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} usuário(s) ativado(s) com sucesso.')
    
    @admin.action(description='Desativar usuários selecionados')
    def deactivate_users(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} usuário(s) desativado(s) com sucesso.')
    
    @admin.action(description='Converter jogador em dono de time')
    def convert_to_team_owner(self, request, queryset):
        """Converte jogadores selecionados em donos de time."""
        converted = 0
        for user in queryset.filter(user_type='PLAYER'):
            # Desativar perfil de jogador se existir
            if hasattr(user, 'player_profile'):
                user.player_profile.is_active = False
                user.player_profile.save()
            
            # Criar perfil de dono se não existir
            if not hasattr(user, 'team_owner_profile'):
                TeamOwnerProfile.objects.create(user=user)
            
            # Atualizar tipo de usuário
            user.user_type = 'TEAM_OWNER'
            user.save()
            converted += 1
        
        self.message_user(request, f'{converted} jogador(es) convertido(s) em dono(s) de time.')


@admin.register(PlayerProfile)
class PlayerProfileAdmin(admin.ModelAdmin):
    """Admin para perfis de jogadores."""
    
    list_display = [
        'player_name',
        'gamer_tag',
        'get_user_email',
        'primary_position',
        'secondary_position',
        'shirt_number',
        'country',
        'is_active_badge'
    ]
    
    list_filter = [
        'primary_position',
        'secondary_position',
        'country',
        'language',
        'is_active',
        'created_at'
    ]
    
    search_fields = [
        'player_name',
        'gamer_tag',
        'user__email',
        'user__first_name',
        'user__last_name'
    ]
    
    readonly_fields = [
        'created_at',
        'updated_at',
        'get_user_link',
        'get_statistics'
    ]
    
    fieldsets = (
        ('Usuário', {
            'fields': ('user', 'get_user_link')
        }),
        ('Informações do Jogador', {
            'fields': (
                'player_name',
                'gamer_tag',
                'shirt_number',
                'birth_date',
                'whatsapp',
                'country',
                'language'
            )
        }),
        ('Posições', {
            'fields': ('primary_position', 'secondary_position')
        }),
        ('Mídia', {
            'fields': ('avatar',)
        }),
        ('Estatísticas', {
            'fields': ('get_statistics',),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_user_email(self, obj):
        """Retorna o email do usuário."""
        return obj.user.email
    get_user_email.short_description = 'Email'
    get_user_email.admin_order_field = 'user__email'
    
    def is_active_badge(self, obj):
        """Badge para status ativo."""
        if obj.is_active:
            return format_html(
                '<span style="color: green;">●</span> Ativo'
            )
        return format_html(
            '<span style="color: red;">●</span> Inativo'
        )
    is_active_badge.short_description = 'Status'
    
    def get_user_link(self, obj):
        """Link para o usuário."""
        return format_html(
            '<a href="/admin/users/user/{}/change/">{}</a>',
            obj.user.id,
            obj.user.email
        )
    get_user_link.short_description = 'Usuário'
    
    def get_statistics(self, obj):
        """Exibe estatísticas do jogador."""
        return format_html(
            '<div style="line-height: 1.8;">'
            '<strong>Jogos:</strong> {}<br>'
            '<strong>Gols:</strong> {}<br>'
            '<strong>Assistências:</strong> {}<br>'
            '<strong>Aproveitamento:</strong> {}%'
            '</div>',
            obj.total_games,
            obj.total_goals,
            obj.total_assists,
            obj.win_rate
        )
    get_statistics.short_description = 'Estatísticas'


@admin.register(TeamOwnerProfile)
class TeamOwnerProfileAdmin(admin.ModelAdmin):
    """Admin para perfis de donos de time."""
    
    list_display = [
        'get_name',
        'get_user_email',
        'get_teams_count',
        'is_active',
        'created_at'
    ]
    
    list_filter = [
        'is_active',
        'created_at'
    ]
    
    search_fields = [
        'user__email',
        'user__first_name',
        'user__last_name',
        'bio'
    ]
    
    readonly_fields = [
        'created_at',
        'updated_at',
        'get_user_link',
        'get_teams_list'
    ]
    
    fieldsets = (
        ('Usuário', {
            'fields': ('user', 'get_user_link')
        }),
        ('Informações', {
            'fields': ('bio', 'avatar')
        }),
        ('Times', {
            'fields': ('get_teams_list',),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_name(self, obj):
        """Nome completo do dono."""
        return obj.user.full_name
    get_name.short_description = 'Nome'
    get_name.admin_order_field = 'user__first_name'
    
    def get_user_email(self, obj):
        """Email do usuário."""
        return obj.user.email
    get_user_email.short_description = 'Email'
    get_user_email.admin_order_field = 'user__email'
    
    def get_teams_count(self, obj):
        """Quantidade de times."""
        count = obj.user.owned_teams.count()
        return format_html(
            '<span style="font-weight: bold;">{}</span> time(s)',
            count
        )
    get_teams_count.short_description = 'Times'
    
    def get_user_link(self, obj):
        """Link para o usuário."""
        return format_html(
            '<a href="/admin/users/user/{}/change/">{}</a>',
            obj.user.id,
            obj.user.email
        )
    get_user_link.short_description = 'Usuário'
    
    def get_teams_list(self, obj):
        """Lista os times do dono."""
        teams = obj.user.owned_teams.all()
        if not teams:
            return 'Nenhum time criado'
        
        items = ''.join([
            f'<li><a href="/admin/fnc_teams/team/{team.id}/change/">{team.name}</a></li>'
            for team in teams
        ])
        return format_html('<ul style="margin: 0; padding-left: 20px;">{}</ul>', items)
    get_teams_list.short_description = 'Times'
