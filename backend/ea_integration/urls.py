from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import EAClubViewSet, EAMatchViewSet, EAPlayerStatsViewSet

router = DefaultRouter()
router.register(r'ea/clubs', EAClubViewSet, basename='ea-club')
router.register(r'ea/matches', EAMatchViewSet, basename='ea-match')
router.register(r'ea/player-stats', EAPlayerStatsViewSet, basename='ea-player-stats')

urlpatterns = [
    path('', include(router.urls)),
]
