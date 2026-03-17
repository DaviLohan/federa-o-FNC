from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TeamViewSet, TeamMembershipViewSet, TeamInvitationViewSet, FormationViewSet, TeamLeaveRequestViewSet

# Criar router e registrar ViewSets
router = DefaultRouter()
router.register(r'teams', TeamViewSet, basename='team')
router.register(r'memberships', TeamMembershipViewSet, basename='membership')
router.register(r'invitations', TeamInvitationViewSet, basename='invitation')
router.register(r'formations', FormationViewSet, basename='formation')
router.register(r'leave-requests', TeamLeaveRequestViewSet, basename='leave-request')

# URLs
urlpatterns = [
    path('', include(router.urls)),
]
