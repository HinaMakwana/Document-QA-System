"""
Models for the conversations app.
"""
import uuid
from django.conf import settings
from django.db import models


class Conversation(models.Model):
    """Conversation thread between user and AI."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations'
    )

    # Conversation metadata
    title = models.CharField(max_length=255, default='New Conversation')
    description = models.TextField(blank=True)

    # Associated documents (for document-specific Q&A)
    documents = models.ManyToManyField(
        'documents.Document',
        related_name='conversations',
        blank=True
    )

    # Settings
    is_active = models.BooleanField(default=True)
    system_prompt = models.TextField(blank=True, help_text="Custom system prompt for this conversation")
    temperature = models.FloatField(default=0.7)
    max_tokens = models.IntegerField(default=2048)

    # Token tracking
    total_tokens_used = models.IntegerField(default=0)
    total_messages = models.IntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'conversations'
        ordering = ['-updated_at']
        verbose_name = 'Conversation'
        verbose_name_plural = 'Conversations'

    def __str__(self):
        return f"{self.title} - {self.user.email}"

    def get_recent_messages(self, limit=10):
        """Get recent messages for context."""
        return self.messages.order_by('-created_at')[:limit][::-1]

    def get_conversation_history(self, limit=20):
        """Get conversation history formatted for LLM."""
        messages = self.messages.order_by('created_at')[:limit]
        history = []
        for msg in messages:
            history.append({
                'role': msg.role,
                'content': msg.content,
            })
        return history


class Message(models.Model):
    """Individual message in a conversation."""

    class Role(models.TextChoices):
        USER = 'user', 'User'
        ASSISTANT = 'assistant', 'Assistant'
        SYSTEM = 'system', 'System'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )

    # Message content
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField()

    # Metadata
    tokens_used = models.IntegerField(default=0)
    model_used = models.CharField(max_length=255, blank=True)
    response_time_ms = models.IntegerField(default=0)

    # Citations (for RAG responses)
    citations = models.JSONField(default=list, blank=True)

    # Error handling
    is_error = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'

    def __str__(self):
        return f"{self.role}: {self.content[:50]}..."


class ConversationFeedback(models.Model):
    """User feedback on AI responses."""

    class Rating(models.IntegerChoices):
        VERY_BAD = 1, 'Very Bad'
        BAD = 2, 'Bad'
        NEUTRAL = 3, 'Neutral'
        GOOD = 4, 'Good'
        VERY_GOOD = 5, 'Very Good'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.OneToOneField(
        Message,
        on_delete=models.CASCADE,
        related_name='feedback'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='feedback'
    )

    rating = models.IntegerField(choices=Rating.choices)
    comment = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'conversation_feedback'
        verbose_name = 'Conversation Feedback'
        verbose_name_plural = 'Conversation Feedbacks'

    def __str__(self):
        return f"Feedback: {self.rating}/5"
