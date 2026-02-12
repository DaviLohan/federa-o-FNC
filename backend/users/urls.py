from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, PlayerProfileViewSet, TeamOwnerProfileViewSet

# Criar router e registrar ViewSets
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'player-profiles', PlayerProfileViewSet, basename='player-profile')
router.register(r'team-owner-profiles', TeamOwnerProfileViewSet, basename='team-owner-profile')

# URLs
urlpatterns = [
    path('', include(router.urls)),
]
