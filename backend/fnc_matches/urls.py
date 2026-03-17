from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MatchViewSet,
    MatchReportViewSet,
    GoalViewSet,
    CardViewSet,
    ContestationViewSet,
    MatchProposalViewSet,
    MatchConfirmationViewSet,
    PenaltyViewSet,
    PenaltyAppealViewSet,
    StatisticsViewSet,
    MatchLineupView,
)

# Criar router e registrar ViewSets
router = DefaultRouter()
router.register(r'matches', MatchViewSet, basename='match')
router.register(r'reports', MatchReportViewSet, basename='report')
router.register(r'goals', GoalViewSet, basename='goal')
router.register(r'cards', CardViewSet, basename='card')
router.register(r'contestations', ContestationViewSet, basename='contestation')
router.register(r'proposals', MatchProposalViewSet, basename='proposal')
router.register(r'confirmations', MatchConfirmationViewSet, basename='confirmation')
router.register(r'penalties', PenaltyViewSet, basename='penalty')
router.register(r'appeals', PenaltyAppealViewSet, basename='appeal')
router.register(r'statistics', StatisticsViewSet, basename='statistics')

# URLs
urlpatterns = [
    path('', include(router.urls)),
    # Escalação tática por partida — fora do router pois tem parâmetro aninhado
    path('matches/<int:match_id>/lineup/', MatchLineupView.as_view(), name='match-lineup'),
]
