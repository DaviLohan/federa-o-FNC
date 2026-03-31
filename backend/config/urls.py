"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from .search_views import global_search
from .admin_views import admin_stats


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    """
    API Root - FNC (Federação Nacional de Clubs)
    
    Sistema de gerenciamento de campeonatos de e-Sports (FIFA/eFootball)
    """
    return Response({
        'message': 'Bem-vindo à API da FNC - Federação Nacional de Clubs',
        'version': '1.0.0',
        'documentation': request.build_absolute_uri('/api/docs/'),
        'endpoints': {
            'admin': request.build_absolute_uri('/admin/'),
            'docs': {
                'swagger': request.build_absolute_uri('/api/docs/'),
                'redoc': request.build_absolute_uri('/api/redoc/'),
                'schema': request.build_absolute_uri('/api/schema/'),
            },
            'api': {
                'users': request.build_absolute_uri('/api/v1/users/'),
                'player_profiles': request.build_absolute_uri('/api/v1/player-profiles/'),
                'team_owner_profiles': request.build_absolute_uri('/api/v1/team-owner-profiles/'),
                'teams': request.build_absolute_uri('/api/v1/teams/'),
                'memberships': request.build_absolute_uri('/api/v1/memberships/'),
                'invitations': request.build_absolute_uri('/api/v1/invitations/'),
                'formations': request.build_absolute_uri('/api/v1/formations/'),
                'championships': request.build_absolute_uri('/api/v1/championships/'),
                'enrollments': request.build_absolute_uri('/api/v1/enrollments/'),
                'standings': request.build_absolute_uri('/api/v1/standings/'),
                'prizes': request.build_absolute_uri('/api/v1/prizes/'),
                'brackets': request.build_absolute_uri('/api/v1/brackets/'),
                'matches': request.build_absolute_uri('/api/v1/matches/'),
                'reports': request.build_absolute_uri('/api/v1/reports/'),
                'goals': request.build_absolute_uri('/api/v1/goals/'),
                'cards': request.build_absolute_uri('/api/v1/cards/'),
                'contestations': request.build_absolute_uri('/api/v1/contestations/'),
                'payments': request.build_absolute_uri('/api/v1/payments/'),
                'player_statistics': request.build_absolute_uri('/api/v1/player-statistics/'),
                'team_statistics': request.build_absolute_uri('/api/v1/team-statistics/'),
                'season_summaries': request.build_absolute_uri('/api/v1/season-summaries/'),
                'top_scorers': request.build_absolute_uri('/api/v1/top-scorers/'),
                'leaderboard': request.build_absolute_uri('/api/v1/leaderboard/'),
                'player_comparison': request.build_absolute_uri('/api/v1/player-comparison/'),
            }
        },
        'authentication': {
            'login': request.build_absolute_uri('/api/v1/users/login/'),
            'register': request.build_absolute_uri('/api/v1/users/'),
        },
        'status': 'online'
    })


urlpatterns = [
    # Root
    path('', api_root, name='api-root'),
    
    # Admin
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API v1
    path('api/v1/search/', global_search, name='global-search'),
    path('api/v1/admin/stats/', admin_stats, name='admin-stats'),
    path('api/v1/', include('users.urls')),
    path('api/v1/', include('fnc_teams.urls')),
    path('api/v1/', include('fnc_championships.urls')),
    path('api/v1/', include('fnc_matches.urls')),
    path('api/v1/', include('player_stats.urls')),
    path('api/v1/', include('fnc_notifications.urls')),
    path('api/v1/', include('fnc_payments.urls')),
]

# Servir arquivos de media (desenvolvimento e produção sem nginx dedicado)
# Em produção com nginx/caddy, este bloco é ignorado pois o servidor web
# intercepta /media/ antes de chegar ao Django.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
