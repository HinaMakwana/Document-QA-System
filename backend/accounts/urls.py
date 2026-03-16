"""
URL patterns for the accounts app.
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenVerifyView

from . import views

app_name = 'accounts'

urlpatterns = [
    # Authentication
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', views.RefreshTokenView.as_view(), name='token-refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token-verify'),

    # Profile
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('password/change/', views.PasswordChangeView.as_view(), name='password-change'),

    # Usage
    path('usage/', views.UsageStatsView.as_view(), name='usage-stats'),

    # API Key management
    path('api-keys/', views.APIKeyListCreateView.as_view(), name='api-keys'),
    path('api-keys/<uuid:key_id>/', views.APIKeyRevokeView.as_view(), name='api-key-revoke'),
]
