from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TeamViewSet, TeamMembershipViewSet, TeamInvitationViewSet, FormationViewSet

# Criar router e registrar ViewSets
router = DefaultRouter()
router.register(r'teams', TeamViewSet, basename='team')
router.register(r'memberships', TeamMembershipViewSet, basename='membership')
router.register(r'invitations', TeamInvitationViewSet, basename='invitation')
router.register(r'formations', FormationViewSet, basename='formation')

# URLs
urlpatterns = [
    path('', include(router.urls)),
]
