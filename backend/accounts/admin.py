"""
Admin configuration for the accounts app.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import User, UserAPIKey, RateLimitRecord


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin for custom User model."""

    list_display = ('email', 'first_name', 'last_name', 'tier', 'is_staff', 'is_active', 'created_at')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'tier')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-created_at',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {'fields': ('first_name', 'last_name')}),
        (_('Subscription'), {'fields': ('tier', 'daily_token_limit', 'monthly_token_limit', 'max_documents')}),
        (_('Usage'), {'fields': ('tokens_used_today', 'tokens_used_month', 'last_token_reset_date', 'last_month_reset_date')}),
        (_('Permissions'), {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'first_name', 'last_name', 'tier'),
        }),
    )


@admin.register(UserAPIKey)
class UserAPIKeyAdmin(admin.ModelAdmin):
    """Admin for API Keys."""

    list_display = ('name', 'user', 'key_prefix', 'is_active', 'last_used_at', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'user__email', 'key_prefix')
    readonly_fields = ('key_prefix', 'key_hash', 'created_at', 'last_used_at')


@admin.register(RateLimitRecord)
class RateLimitRecordAdmin(admin.ModelAdmin):
    """Admin for rate limit records."""

    list_display = ('user', 'ip_address', 'endpoint', 'request_count', 'window_start')
    list_filter = ('endpoint', 'window_start')
    search_fields = ('user__email', 'ip_address', 'endpoint')
