"""
Admin configuration for the analytics app.
"""
from django.contrib import admin
from .models import UsageLog, DailyUsageSummary, SystemMetrics


@admin.register(UsageLog)
class UsageLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'event_type', 'tokens_used', 'processing_time_ms', 'created_at')
    list_filter = ('event_type', 'created_at')
    search_fields = ('user__email', 'endpoint')
    readonly_fields = ('id', 'created_at')
    ordering = ('-created_at',)

    date_hierarchy = 'created_at'


@admin.register(DailyUsageSummary)
class DailyUsageSummaryAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'chat_count', 'search_count', 'total_tokens', 'estimated_cost')
    list_filter = ('date',)
    search_fields = ('user__email',)
    ordering = ('-date',)

    date_hierarchy = 'date'


@admin.register(SystemMetrics)
class SystemMetricsAdmin(admin.ModelAdmin):
    list_display = (
        'date', 'total_users', 'active_users', 'new_users',
        'total_documents', 'total_messages', 'total_tokens_used'
    )
    list_filter = ('date',)
    ordering = ('-date',)
    readonly_fields = ('id', 'created_at')

    date_hierarchy = 'date'
