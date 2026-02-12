from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PlayerStatisticsViewSet,
    TeamStatisticsViewSet,
    SeasonSummaryViewSet,
    TopScorerViewSet,
    LeaderboardAPIView,
    PlayerComparisonAPIView
)

# Criar router e registrar ViewSets
router = DefaultRouter()
router.register(r'player-statistics', PlayerStatisticsViewSet, basename='player-statistics')
router.register(r'team-statistics', TeamStatisticsViewSet, basename='team-statistics')
router.register(r'season-summaries', SeasonSummaryViewSet, basename='season-summary')
router.register(r'top-scorers', TopScorerViewSet, basename='top-scorer')

# URLs
urlpatterns = [
    path('', include(router.urls)),
    path('leaderboard/', LeaderboardAPIView.as_view(), name='leaderboard'),
    path('player-comparison/', PlayerComparisonAPIView.as_view(), name='player-comparison'),
]
