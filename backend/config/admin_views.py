from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from fnc_teams.models import Team
from fnc_championships.models import Championship
from fnc_matches.models import Match
from users.models import PlayerProfile

User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    """
    Retorna estatísticas globais do sistema para administradores.
    
    Requer: ADMIN ou SUPERVISOR
    """
    user = request.user
    
    # Verificar se é admin ou supervisor
    if user.user_type not in ['ADMIN', 'SUPERVISOR']:
        return Response(
            {'error': 'Você não tem permissão para acessar estas estatísticas.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Estatísticas gerais
    total_users = User.objects.filter(is_active=True).count()
    total_players = PlayerProfile.objects.count()
    total_teams = Team.objects.filter(is_active=True).count()
    total_championships = Championship.objects.count()
    total_matches = Match.objects.count()
    
    # Estatísticas por status de campeonato
    championships_open = Championship.objects.filter(status='OPEN').count()
    championships_in_progress = Championship.objects.filter(status='IN_PROGRESS').count()
    championships_finished = Championship.objects.filter(status='FINISHED').count()
    
    # Estatísticas por status de partida
    matches_scheduled = Match.objects.filter(status='SCHEDULED').count()
    matches_live = Match.objects.filter(status='LIVE').count()
    matches_finished = Match.objects.filter(status='FINISHED').count()
    matches_contested = Match.objects.filter(status='CONTESTED').count()
    
    # Usuários por tipo
    users_by_type = User.objects.filter(is_active=True).values('user_type').annotate(count=Count('id'))
    
    # Novos usuários (últimos 7 dias)
    seven_days_ago = timezone.now() - timedelta(days=7)
    new_users_week = User.objects.filter(
        is_active=True,
        date_joined__gte=seven_days_ago
    ).count()
    
    # Times criados recentemente (últimos 7 dias)
    new_teams_week = Team.objects.filter(
        is_active=True,
        created_at__gte=seven_days_ago
    ).count()
    
    # Partidas recentes (últimos 7 dias)
    recent_matches = Match.objects.filter(
        created_at__gte=seven_days_ago
    ).count()
    
    return Response({
        'overview': {
            'total_users': total_users,
            'total_players': total_players,
            'total_teams': total_teams,
            'total_championships': total_championships,
            'total_matches': total_matches,
        },
        'championships': {
            'open': championships_open,
            'in_progress': championships_in_progress,
            'finished': championships_finished,
        },
        'matches': {
            'scheduled': matches_scheduled,
            'live': matches_live,
            'finished': matches_finished,
            'contested': matches_contested,
        },
        'users_by_type': {item['user_type']: item['count'] for item in users_by_type},
        'recent_activity': {
            'new_users_week': new_users_week,
            'new_teams_week': new_teams_week,
            'recent_matches': recent_matches,
        }
    })
