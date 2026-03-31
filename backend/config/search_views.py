from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q

from fnc_teams.models import Team
from fnc_teams.serializers import TeamListSerializer
from fnc_championships.models import Championship
from fnc_championships.serializers import ChampionshipListSerializer
from fnc_matches.models import Match
from fnc_matches.serializers import MatchListSerializer
from users.models import User, PlayerProfile
from users.serializers import PlayerProfileSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_search(request):
    """
    Busca global no sistema.
    
    Query params:
    - q: termo de busca (obrigatório)
    - limit: limite de resultados por categoria (padrão: 5)
    
    Retorna resultados de:
    - Times (nome, sigla)
    - Jogadores (nome, gamertag)
    - Campeonatos (nome)
    - Partidas (times participantes)
    """
    query = request.query_params.get('q', '').strip()
    
    if not query or len(query) < 2:
        return Response({
            'error': 'O termo de busca deve ter pelo menos 2 caracteres.',
            'results': {
                'teams': [],
                'players': [],
                'championships': [],
                'matches': [],
            },
            'total': 0
        })
    
    limit = int(request.query_params.get('limit', 5))
    
    # Buscar times
    teams = Team.objects.filter(
        Q(name__icontains=query) | Q(abbreviation__icontains=query),
        is_active=True
    )[:limit]
    
    # Buscar jogadores
    players = PlayerProfile.objects.filter(
        Q(user__username__icontains=query) |
        Q(user__first_name__icontains=query) |
        Q(user__last_name__icontains=query) |
        Q(gamertag__icontains=query)
    )[:limit]
    
    # Buscar campeonatos
    championships = Championship.objects.filter(
        Q(name__icontains=query) | Q(description__icontains=query)
    )[:limit]
    
    # Buscar partidas (por times participantes)
    matches = Match.objects.filter(
        Q(team_a__name__icontains=query) |
        Q(team_b__name__icontains=query) |
        Q(championship__name__icontains=query)
    ).select_related('team_a', 'team_b', 'championship')[:limit]
    
    # Serializar resultados
    results = {
        'teams': TeamListSerializer(teams, many=True).data,
        'players': PlayerProfileSerializer(players, many=True).data,
        'championships': ChampionshipListSerializer(championships, many=True).data,
        'matches': MatchListSerializer(matches, many=True).data,
    }
    
    total = len(results['teams']) + len(results['players']) + len(results['championships']) + len(results['matches'])
    
    return Response({
        'query': query,
        'results': results,
        'total': total
    })
