"""
Views for the accounts app.
"""
from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .serializers import (
    UserRegistrationSerializer,
    UserSerializer,
    UserUpdateSerializer,
    PasswordChangeSerializer,
    CustomTokenObtainPairSerializer,
    UserAPIKeySerializer,
    UserAPIKeyCreateSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    Register a new user account.

    Create a new user with email and password.
    Returns JWT tokens upon successful registration.
    """
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    """
    Authenticate user and return JWT tokens.

    Provide email and password to receive access and refresh tokens.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class RefreshTokenView(TokenRefreshView):
    """
    Refresh access token using refresh token.
    """
    permission_classes = [permissions.AllowAny]


class LogoutView(APIView):
    """
    Logout user by blacklisting refresh token.
    """
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'refresh': openapi.Schema(type=openapi.TYPE_STRING, description='Refresh token'),
            },
            required=['refresh']
        ),
        responses={
            200: openapi.Response('Successfully logged out'),
            400: openapi.Response('Bad request'),
        }
    )
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response({
                    'success': False,
                    'error': 'Refresh token is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            token = RefreshToken(refresh_token)
            token.blacklist()

            return Response({
                'success': True,
                'message': 'Successfully logged out'
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    Get or update user profile.

    GET: Retrieve current user's profile
    PATCH/PUT: Update current user's profile
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response({
            'success': True,
            'message': 'Profile updated successfully',
            'data': UserSerializer(instance).data
        })


class PasswordChangeView(APIView):
    """
    Change user password.
    """
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        request_body=PasswordChangeSerializer,
        responses={
            200: openapi.Response('Password changed successfully'),
            400: openapi.Response('Validation error'),
        }
    )
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()

        return Response({
            'success': True,
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)


class UsageStatsView(APIView):
    """
    Get user's usage statistics.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        user.reset_daily_tokens()
        user.reset_monthly_tokens()

        # Get document count
        from documents.models import Document
        document_count = Document.objects.filter(user=user).count()

        # Get conversation count
        from conversations.models import Conversation
        conversation_count = Conversation.objects.filter(user=user).count()

        return Response({
            'success': True,
            'data': {
                'tier': user.tier,
                'tier_limits': user.get_tier_limits(),
                'token_usage': {
                    'today': {
                        'used': user.tokens_used_today,
                        'limit': user.daily_token_limit,
                        'remaining': max(0, user.daily_token_limit - user.tokens_used_today),
                        'percentage': round((user.tokens_used_today / user.daily_token_limit) * 100, 2) if user.daily_token_limit > 0 else 0,
                    },
                    'month': {
                        'used': user.tokens_used_month,
                        'limit': user.monthly_token_limit,
                        'remaining': max(0, user.monthly_token_limit - user.tokens_used_month),
                        'percentage': round((user.tokens_used_month / user.monthly_token_limit) * 100, 2) if user.monthly_token_limit > 0 else 0,
                    },
                },
                'documents': {
                    'count': document_count,
                    'limit': user.max_documents,
                    'remaining': max(0, user.max_documents - document_count),
                },
                'conversations': {
                    'count': conversation_count,
                },
            }
        })


class APIKeyListCreateView(APIView):
    """
    Manage user API keys.

    GET: List all active API keys (key hash never exposed)
    POST: Create a new API key (full key returned ONCE only)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import UserAPIKey
        keys = UserAPIKey.objects.filter(user=request.user).order_by('-created_at')
        return Response({
            'success': True,
            'data': UserAPIKeySerializer(keys, many=True).data
        })

    @swagger_auto_schema(
        request_body=UserAPIKeyCreateSerializer,
        responses={
            201: openapi.Response('API key created — store the key immediately, it will never be shown again'),
            400: openapi.Response('Validation error'),
        }
    )
    def post(self, request):
        serializer = UserAPIKeyCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        api_key = serializer.save()

        return Response({
            'success': True,
            'message': 'API key created. Store the key immediately — it will not be shown again.',
            'data': {
                'id': str(api_key.id),
                'name': api_key.name,
                'key': api_key._raw_key,  # Only time the raw key is returned
                'key_prefix': api_key.key_prefix,
                'expires_at': api_key.expires_at.isoformat() if api_key.expires_at else None,
                'created_at': api_key.created_at.isoformat(),
            }
        }, status=status.HTTP_201_CREATED)


class APIKeyRevokeView(APIView):
    """
    Revoke (deactivate) a specific API key.
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, key_id):
        from .models import UserAPIKey
        try:
            api_key = UserAPIKey.objects.get(id=key_id, user=request.user)
        except UserAPIKey.DoesNotExist:
            return Response({
                'success': False,
                'error': 'API key not found'
            }, status=status.HTTP_404_NOT_FOUND)

        api_key.is_active = False
        api_key.save(update_fields=['is_active'])

        return Response({
            'success': True,
            'message': f'API key "{api_key.name}" has been revoked'
        })
