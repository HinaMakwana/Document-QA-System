"""
Models for the embeddings app.
"""
import uuid
from django.conf import settings
from django.db import models


class EmbeddingModel(models.Model):
    """Track embedding models used."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    provider = models.CharField(max_length=255)  # e.g., 'huggingface', 'openai'
    dimension = models.IntegerField()  # Vector dimension
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'embedding_models'
        verbose_name = 'Embedding Model'
        verbose_name_plural = 'Embedding Models'

    def __str__(self):
        return f"{self.name} ({self.dimension}d)"


class EmbeddingRecord(models.Model):
    """Track embeddings generated for document chunks."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chunk = models.OneToOneField(
        'documents.DocumentChunk',
        on_delete=models.CASCADE,
        related_name='embedding_record'
    )

    # Embedding metadata
    model_name = models.CharField(max_length=255)
    vector_id = models.CharField(max_length=255)  # ID in vector store
    dimension = models.IntegerField()

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'embedding_records'
        verbose_name = 'Embedding Record'
        verbose_name_plural = 'Embedding Records'

    def __str__(self):
        return f"Embedding for chunk {self.chunk.chunk_index}"


class SearchQuery(models.Model):
    """Track search queries for analytics."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='search_queries'
    )

    query_text = models.TextField()
    results_count = models.IntegerField(default=0)
    search_time_ms = models.IntegerField(default=0)

    # Filter criteria
    document_ids = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'search_queries'
        ordering = ['-created_at']
        verbose_name = 'Search Query'
        verbose_name_plural = 'Search Queries'

    def __str__(self):
        return f"{self.query_text[:50]}..."
