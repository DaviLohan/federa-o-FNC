from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet,
    PlayerProfileViewSet,
    TeamOwnerProfileViewSet,
    VerifyEmailView,
    ResendVerificationView,
    ForgotPasswordView,
    ResetPasswordView,
)

# Criar router e registrar ViewSets
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'player-profiles', PlayerProfileViewSet, basename='player-profile')
router.register(r'team-owner-profiles', TeamOwnerProfileViewSet, basename='team-owner-profile')

# URLs de autenticação por email (sem autenticação)
auth_urlpatterns = [
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('resend-verification/', ResendVerificationView.as_view(), name='resend-verification'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
]

# URLs
urlpatterns = [
    path('', include(router.urls)),
    path('auth/', include((auth_urlpatterns, 'auth'))),
]
