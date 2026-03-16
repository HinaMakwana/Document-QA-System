"""
Admin configuration for the embeddings app.
"""
from django.contrib import admin
from .models import EmbeddingModel, EmbeddingRecord, SearchQuery


@admin.register(EmbeddingModel)
class EmbeddingModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'provider', 'dimension', 'is_active', 'created_at')
    list_filter = ('provider', 'is_active')
    search_fields = ('name',)


@admin.register(EmbeddingRecord)
class EmbeddingRecordAdmin(admin.ModelAdmin):
    list_display = ('chunk', 'model_name', 'dimension', 'created_at')
    list_filter = ('model_name', 'created_at')
    search_fields = ('chunk__document__title', 'vector_id')


@admin.register(SearchQuery)
class SearchQueryAdmin(admin.ModelAdmin):
    list_display = ('user', 'query_text', 'results_count', 'search_time_ms', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__email', 'query_text')
    readonly_fields = ('created_at',)
