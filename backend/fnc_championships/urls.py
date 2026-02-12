from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ChampionshipViewSet,
    ChampionshipEnrollmentViewSet,
    StandingsViewSet,
    ChampionshipPrizeViewSet,
    BracketViewSet
)

# Criar router e registrar ViewSets
router = DefaultRouter()
router.register(r'championships', ChampionshipViewSet, basename='championship')
router.register(r'enrollments', ChampionshipEnrollmentViewSet, basename='enrollment')
router.register(r'standings', StandingsViewSet, basename='standings')
router.register(r'prizes', ChampionshipPrizeViewSet, basename='prize')
router.register(r'brackets', BracketViewSet, basename='bracket')

# URLs
urlpatterns = [
    path('', include(router.urls)),
]
