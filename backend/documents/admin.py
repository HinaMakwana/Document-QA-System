"""
Admin configuration for the documents app.
"""
from django.contrib import admin
from .models import Document, DocumentChunk


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    """Admin for Document model."""

    list_display = ('title', 'user', 'file_type', 'status', 'chunk_count', 'created_at')
    list_filter = ('status', 'file_type', 'created_at')
    search_fields = ('title', 'description', 'user__email')
    readonly_fields = (
        'id', 'file_size', 'original_filename', 'page_count',
        'word_count', 'chunk_count', 'processing_started_at',
        'processing_completed_at', 'celery_task_id', 'created_at', 'updated_at'
    )
    ordering = ('-created_at',)

    fieldsets = (
        (None, {'fields': ('id', 'user', 'title', 'description')}),
        ('File', {'fields': ('file', 'file_type', 'file_size', 'original_filename')}),
        ('Processing', {'fields': ('status', 'status_message', 'celery_task_id')}),
        ('Metrics', {'fields': ('page_count', 'word_count', 'chunk_count')}),
        ('Timestamps', {'fields': ('processing_started_at', 'processing_completed_at', 'created_at', 'updated_at')}),
    )


@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    """Admin for DocumentChunk model."""

    list_display = ('document', 'chunk_index', 'token_count', 'has_embedding', 'created_at')
    list_filter = ('has_embedding', 'created_at')
    search_fields = ('document__title', 'content')
    readonly_fields = ('id', 'embedding_id', 'created_at')
    ordering = ('document', 'chunk_index')
