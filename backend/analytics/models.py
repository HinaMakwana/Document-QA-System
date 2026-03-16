"""
Models for the analytics app.
"""
import uuid
from django.conf import settings
from django.db import models


class UsageLog(models.Model):
    """Log of API usage for analytics."""

    class EventType(models.TextChoices):
        CHAT = 'chat', 'Chat Message'
        SEARCH = 'search', 'Semantic Search'
        UPLOAD = 'upload', 'Document Upload'
        EMBEDDING = 'embedding', 'Embedding Generation'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='usage_logs'
    )

    event_type = models.CharField(max_length=20, choices=EventType.choices)

    # Resource tracking
    tokens_used = models.IntegerField(default=0)
    processing_time_ms = models.IntegerField(default=0)

    # Cost estimation (for tracking purposes)
    estimated_cost = models.DecimalField(
        max_digits=10, decimal_places=6, default=0
    )

    # Additional metadata
    metadata = models.JSONField(default=dict, blank=True)

    # Request info
    endpoint = models.CharField(max_length=200, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'usage_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['event_type', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.event_type} - {self.created_at}"


class DailyUsageSummary(models.Model):
    """Daily aggregated usage statistics."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='daily_summaries'
    )
    date = models.DateField()

    # Counts
    chat_count = models.IntegerField(default=0)
    search_count = models.IntegerField(default=0)
    upload_count = models.IntegerField(default=0)

    # Token usage
    total_tokens = models.IntegerField(default=0)
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)

    # Performance
    avg_response_time_ms = models.IntegerField(default=0)

    # Cost
    estimated_cost = models.DecimalField(
        max_digits=10, decimal_places=6, default=0
    )

    class Meta:
        db_table = 'daily_usage_summaries'
        unique_together = ['user', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.email} - {self.date}"


class SystemMetrics(models.Model):
    """System-wide metrics for admin dashboard."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField(unique=True)

    # User metrics
    total_users = models.IntegerField(default=0)
    active_users = models.IntegerField(default=0)
    new_users = models.IntegerField(default=0)

    # Document metrics
    total_documents = models.IntegerField(default=0)
    documents_processed = models.IntegerField(default=0)
    total_chunks = models.IntegerField(default=0)

    # Conversation metrics
    total_conversations = models.IntegerField(default=0)
    total_messages = models.IntegerField(default=0)

    # Token metrics
    total_tokens_used = models.BigIntegerField(default=0)
    estimated_total_cost = models.DecimalField(
        max_digits=12, decimal_places=6, default=0
    )

    # Performance
    avg_response_time_ms = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'system_metrics'
        ordering = ['-date']

    def __str__(self):
        return f"System Metrics - {self.date}"
