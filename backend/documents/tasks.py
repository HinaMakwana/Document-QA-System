"""
Celery tasks for document processing.
"""
import logging
from celery import shared_task
from django.utils import timezone

from .models import Document, DocumentChunk
from .services import DocumentProcessor, TextCleaner

logger = logging.getLogger('ai_doc')


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_document_task(self, document_id: str):
    """
    Process a document asynchronously.

    This task:
    1. Extracts text from the document
    2. Splits text into chunks
    3. Stores chunks in the database
    4. Triggers embedding generation
    """
    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        logger.error(f"Document {document_id} not found")
        return {'success': False, 'error': 'Document not found'}

    try:
        # Update status to processing
        document.status = Document.Status.PROCESSING
        document.processing_started_at = timezone.now()
        document.celery_task_id = self.request.id
        document.save()

        logger.info(f"Starting processing for document {document_id}")

        # Process document
        processor = DocumentProcessor()
        result = processor.process_document(document)

        # Clean text
        cleaner = TextCleaner()
        clean_text = cleaner.clean_text(result['text'])

        # Create chunks
        chunks = processor.chunk_text(clean_text)

        # Store chunks in database
        chunk_objects = []
        for chunk_data in chunks:
            chunk_objects.append(DocumentChunk(
                document=document,
                content=chunk_data['content'],
                chunk_index=chunk_data['chunk_index'],
                start_char=chunk_data['start_char'],
                end_char=chunk_data['end_char'],
                token_count=chunk_data['token_count'],
            ))

        # Bulk create chunks
        DocumentChunk.objects.bulk_create(chunk_objects)

        # Update document metadata
        document.page_count = result.get('page_count', 0)
        document.word_count = result.get('word_count', 0)
        document.chunk_count = len(chunks)
        document.status = Document.Status.COMPLETED
        document.status_message = 'Document processed successfully'
        document.processing_completed_at = timezone.now()
        document.save()

        logger.info(f"Document {document_id} processed successfully. {len(chunks)} chunks created.")

        # Trigger embedding generation
        from embeddings.tasks import generate_embeddings_task
        generate_embeddings_task.delay(document_id)

        return {
            'success': True,
            'document_id': str(document_id),
            'chunks_created': len(chunks),
            'page_count': result.get('page_count', 0),
            'word_count': result.get('word_count', 0),
        }

    except Exception as e:
        logger.error(f"Error processing document {document_id}: {str(e)}")

        document.status = Document.Status.FAILED
        document.status_message = f"Processing failed: {str(e)}"
        document.save()

        # Retry on failure
        raise self.retry(exc=e)


@shared_task
def cleanup_failed_documents():
    """Cleanup documents that have been stuck in processing state."""
    from datetime import timedelta

    threshold = timezone.now() - timedelta(hours=1)

    stuck_documents = Document.objects.filter(
        status=Document.Status.PROCESSING,
        processing_started_at__lt=threshold
    )

    for doc in stuck_documents:
        doc.status = Document.Status.FAILED
        doc.status_message = "Processing timed out"
        doc.save()
        logger.warning(f"Marked document {doc.id} as failed due to timeout")

    return {'cleaned_up': stuck_documents.count()}
