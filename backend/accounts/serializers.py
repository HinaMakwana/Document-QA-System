"""
Serializers for the accounts app.
"""
import hashlib
import secrets
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import UserAPIKey

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ['email', 'password', 'password_confirm', 'first_name', 'last_name']

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': "Passwords don't match."
            })
        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details."""

    full_name = serializers.ReadOnlyField()
    tier_limits = serializers.SerializerMethodField()
    usage_stats = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'tier', 'tier_limits', 'usage_stats',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'email', 'tier', 'created_at', 'updated_at']

    def get_tier_limits(self, obj):
        return obj.get_tier_limits()

    def get_usage_stats(self, obj):
        obj.reset_daily_tokens()
        obj.reset_monthly_tokens()
        return {
            'tokens_used_today': obj.tokens_used_today,
            'tokens_used_month': obj.tokens_used_month,
            'daily_limit': obj.daily_token_limit,
            'monthly_limit': obj.monthly_token_limit,
            'daily_remaining': max(0, obj.daily_token_limit - obj.tokens_used_today),
            'monthly_remaining': max(0, obj.monthly_token_limit - obj.tokens_used_month),
        }


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""

    class Meta:
        model = User
        fields = ['first_name', 'last_name']


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change."""

    old_password = serializers.CharField(required=True, style={'input_type': 'password'})
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(required=True, style={'input_type': 'password'})

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': "New passwords don't match."
            })
        return attrs

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer with additional user info."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['email'] = user.email
        token['tier'] = user.tier
        token['full_name'] = user.full_name

        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        # Add user data to response
        data['user'] = UserSerializer(self.user).data

        return data


class UserAPIKeySerializer(serializers.ModelSerializer):
    """Serializer for listing user API keys (key never shown after creation)."""

    class Meta:
        model = UserAPIKey
        fields = ['id', 'name', 'key_prefix', 'is_active', 'last_used_at', 'expires_at', 'created_at']
        read_only_fields = ['id', 'key_prefix', 'last_used_at', 'created_at']


class UserAPIKeyCreateSerializer(serializers.Serializer):
    """Serializer for creating a new API key — returns full key only once."""

    name = serializers.CharField(max_length=255, required=True)
    expires_at = serializers.DateTimeField(required=False, allow_null=True)

    def create(self, validated_data):
        user = self.context['request'].user

        # Generate a secure random key
        raw_key = secrets.token_urlsafe(32)
        key_prefix = raw_key[:8]
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

        api_key = UserAPIKey.objects.create(
            user=user,
            name=validated_data['name'],
            key_prefix=key_prefix,
            key_hash=key_hash,
            expires_at=validated_data.get('expires_at'),
        )

        # Attach raw key to instance (only available immediately after creation)
        api_key._raw_key = raw_key
        return api_key
