from django.contrib import admin

from .models import EAClub, EAMatch, EAPlayerMatchStats, MatchValidationLog


@admin.register(EAClub)
class EAClubAdmin(admin.ModelAdmin):
    list_display = ['name', 'ea_club_id', 'platform', 'team', 'is_active', 'last_synced_at']
    list_filter = ['platform', 'is_active']
    search_fields = ['name', 'ea_club_id']
    raw_id_fields = ['team']
    readonly_fields = ['created_at', 'updated_at', 'last_synced_at']


@admin.register(EAMatch)
class EAMatchAdmin(admin.ModelAdmin):
    list_display = [
        'ea_match_id', 'home_club_name', 'home_score',
        'away_score', 'away_club_name', 'match_type',
        'source', 'validation_status', 'linked_match', 'played_at',
    ]
    list_filter = ['match_type', 'source', 'validation_status', 'played_at']
    search_fields = ['ea_match_id', 'home_club_name', 'away_club_name']
    raw_id_fields = ['home_club', 'away_club', 'linked_match']
    readonly_fields = ['created_at', 'updated_at', 'validation_notes']
    date_hierarchy = 'played_at'

    fieldsets = (
        ('Informações da Partida', {
            'fields': (
                'ea_match_id', 'match_type', 'played_at',
                'home_club', 'home_club_name', 'home_score',
                'away_club', 'away_club_name', 'away_score',
            ),
        }),
        ('Validação', {
            'fields': (
                'source', 'validation_status', 'linked_match', 'validation_notes',
            ),
        }),
        ('Metadados', {
            'classes': ('collapse',),
            'fields': ('raw_data', 'created_at', 'updated_at'),
        }),
    )


@admin.register(EAPlayerMatchStats)
class EAPlayerMatchStatsAdmin(admin.ModelAdmin):
    list_display = [
        'player_name', 'position', 'rating', 'goals',
        'assists', 'ea_club', 'ea_match',
    ]
    list_filter = ['position', 'ea_club']
    search_fields = ['player_name']
    raw_id_fields = ['ea_match', 'ea_club']
    readonly_fields = ['created_at']


@admin.register(MatchValidationLog)
class MatchValidationLogAdmin(admin.ModelAdmin):
    list_display = [
        'ea_match', 'validation_type', 'severity',
        'short_details', 'created_at',
    ]
    list_filter = ['validation_type', 'severity', 'created_at']
    search_fields = ['details', 'ea_match__ea_match_id']
    raw_id_fields = ['ea_match']
    readonly_fields = ['created_at', 'details', 'raw_comparison']

    fieldsets = (
        (None, {
            'fields': ('ea_match', 'validation_type', 'severity', 'details'),
        }),
        ('Detalhes Técnicos', {
            'classes': ('collapse',),
            'fields': ('raw_comparison', 'created_at'),
        }),
    )

    @admin.display(description='Detalhes')
    def short_details(self, obj):
        """Trunca detalhes para exibição na lista."""
        if obj.details and len(obj.details) > 80:
            return f'{obj.details[:80]}...'
        return obj.details or '-'
