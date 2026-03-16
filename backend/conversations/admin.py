"""
Admin configuration for the conversations app.
"""
from django.contrib import admin
from .models import Conversation, Message, ConversationFeedback


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'total_messages', 'total_tokens_used', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('title', 'user__email')
    readonly_fields = ('id', 'total_tokens_used', 'total_messages', 'created_at', 'updated_at', 'last_message_at')
    filter_horizontal = ('documents',)

    fieldsets = (
        (None, {'fields': ('id', 'user', 'title', 'description')}),
        ('Documents', {'fields': ('documents',)}),
        ('Settings', {'fields': ('system_prompt', 'temperature', 'max_tokens', 'is_active')}),
        ('Stats', {'fields': ('total_tokens_used', 'total_messages')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at', 'last_message_at')}),
    )


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'role', 'content_preview', 'tokens_used', 'is_error', 'created_at')
    list_filter = ('role', 'is_error', 'created_at')
    search_fields = ('content', 'conversation__title')
    readonly_fields = ('id', 'created_at')

    def content_preview(self, obj):
        return obj.content[:100] + '...' if len(obj.content) > 100 else obj.content
    content_preview.short_description = 'Content'


@admin.register(ConversationFeedback)
class ConversationFeedbackAdmin(admin.ModelAdmin):
    list_display = ('message', 'user', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('user__email', 'comment')
    readonly_fields = ('created_at',)
