"""
Models for the documents app.
"""
import uuid
from django.conf import settings
from django.db import models
from cloudinary_storage.storage import RawMediaCloudinaryStorage


def document_upload_path(instance, filename):
    """Generate upload path for documents."""
    return f"documents/{instance.user.id}/{instance.id}/{filename}"


class Document(models.Model):
    """Document uploaded by user."""

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'

    class FileType(models.TextChoices):
        PDF = 'pdf', 'PDF'
        DOCX = 'docx', 'DOCX'
        DOC = 'doc', 'DOC'
        TXT = 'txt', 'TXT'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='documents'
    )

    # File information
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to=document_upload_path, max_length=500, storage=RawMediaCloudinaryStorage())
    file_type = models.CharField(max_length=255, choices=FileType.choices)
    file_size = models.IntegerField(default=0)  # Size in bytes
    original_filename = models.CharField(max_length=255)

    # Processing status
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    status_message = models.TextField(blank=True)

    # Content information
    page_count = models.IntegerField(default=0)
    word_count = models.IntegerField(default=0)
    chunk_count = models.IntegerField(default=0)

    # Processing metadata
    processing_started_at = models.DateTimeField(null=True, blank=True)
    processing_completed_at = models.DateTimeField(null=True, blank=True)
    celery_task_id = models.CharField(max_length=255, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'documents'
        ordering = ['-created_at']
        verbose_name = 'Document'
        verbose_name_plural = 'Documents'

    def __str__(self):
        return f"{self.title} ({self.file_type})"

    @property
    def file_size_mb(self):
        """Get file size in MB."""
        return round(self.file_size / (1024 * 1024), 2)

    def delete(self, *args, **kwargs):
        """Delete file from storage when document is deleted."""
        import logging
        logger = logging.getLogger('ai_doc')

        # Try to delete file from storage but don't block DB deletion if it fails
        if self.file:
            try:
                self.file.delete(save=False)
            except Exception as e:
                logger.warning(f"Could not delete file for document {self.id}: {str(e)}")

        # Delete associated chunks
        self.chunks.all().delete()

        super().delete(*args, **kwargs)


class DocumentChunk(models.Model):
    """Chunks of document text for embedding and retrieval."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='chunks'
    )

    # Chunk content
    content = models.TextField()
    chunk_index = models.IntegerField()  # Order in the document

    # Position information
    page_number = models.IntegerField(null=True, blank=True)
    start_char = models.IntegerField(null=True, blank=True)
    end_char = models.IntegerField(null=True, blank=True)

    # Embedding information
    embedding_id = models.CharField(max_length=255, blank=True)  # ID in vector store
    has_embedding = models.BooleanField(default=False)

    # Metadata
    token_count = models.IntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'document_chunks'
        ordering = ['document', 'chunk_index']
        verbose_name = 'Document Chunk'
        verbose_name_plural = 'Document Chunks'

    def __str__(self):
        return f"{self.document.title} - Chunk {self.chunk_index}"

    @property
    def content_preview(self):
        """Get a preview of the chunk content."""
        return self.content[:200] + '...' if len(self.content) > 200 else self.content
