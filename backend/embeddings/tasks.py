"""
Celery tasks for embedding generation.
"""
import logging
from celery import shared_task
from django.utils import timezone

from documents.models import Document, DocumentChunk
from .models import EmbeddingRecord
from .services import VectorStoreService, EmbeddingService

logger = logging.getLogger('ai_doc')


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_embeddings_task(self, document_id: str):
    """
    Generate embeddings for all chunks of a document.

    This task:
    1. Gets all chunks for the document
    2. Generates embeddings using HuggingFace
    3. Stores embeddings in ChromaDB
    4. Updates chunk records with embedding IDs
    """
    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        logger.error(f"Document {document_id} not found")
        return {'success': False, 'error': 'Document not found'}

    try:
        logger.info(f"Starting embedding generation for document {document_id}")

        # Get chunks without embeddings
        chunks = DocumentChunk.objects.filter(
            document=document,
            has_embedding=False
        ).order_by('chunk_index')

        if not chunks.exists():
            logger.info(f"No chunks to process for document {document_id}")
            return {'success': True, 'message': 'No chunks to process'}

        # Prepare data for vector store
        ids = []
        documents_text = []
        metadatas = []

        for chunk in chunks:
            chunk_id = f"{document_id}_{chunk.chunk_index}"
            ids.append(chunk_id)
            documents_text.append(chunk.content)
            metadatas.append({
                'document_id': str(document.id),
                'document_title': document.title,
                'chunk_index': chunk.chunk_index,
                'page_number': chunk.page_number or 0,
                'user_id': str(document.user.id),
            })

        # Generate embeddings and store in vector store
        vector_service = VectorStoreService()
        embedding_service = EmbeddingService()

        # Generate embeddings
        embeddings = embedding_service.get_embeddings(documents_text)

        # Add to vector store
        vector_service.add_documents(
            ids=ids,
            documents=documents_text,
            metadatas=metadatas,
            embeddings=embeddings
        )

        # Update chunk records
        embedding_records = []
        for i, chunk in enumerate(chunks):
            chunk.has_embedding = True
            chunk.embedding_id = ids[i]
            chunk.save(update_fields=['has_embedding', 'embedding_id'])

            # Create embedding record
            embedding_records.append(EmbeddingRecord(
                chunk=chunk,
                model_name=embedding_service.model_name,
                vector_id=ids[i],
                dimension=embedding_service.dimension,
            ))

        # Bulk create embedding records
        EmbeddingRecord.objects.bulk_create(embedding_records, ignore_conflicts=True)

        logger.info(f"Generated embeddings for {len(chunks)} chunks of document {document_id}")

        return {
            'success': True,
            'document_id': str(document_id),
            'chunks_processed': len(chunks),
        }

    except Exception as e:
        logger.error(f"Error generating embeddings for document {document_id}: {str(e)}")
        raise self.retry(exc=e)


@shared_task
def rebuild_embeddings_task(document_id: str):
    """
    Rebuild all embeddings for a document.

    This deletes existing embeddings and regenerates them.
    """
    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        logger.error(f"Document {document_id} not found")
        return {'success': False, 'error': 'Document not found'}

    try:
        # Delete existing embeddings from vector store
        vector_service = VectorStoreService()
        vector_service.delete_document(str(document_id))

        # Reset chunk embedding status
        DocumentChunk.objects.filter(document=document).update(
            has_embedding=False,
            embedding_id=''
        )

        # Delete embedding records
        EmbeddingRecord.objects.filter(chunk__document=document).delete()

        # Generate new embeddings (enqueue as async task, don't block)
        generate_embeddings_task.delay(str(document_id))

    except Exception as e:
        logger.error(f"Error rebuilding embeddings for document {document_id}: {str(e)}")
        return {'success': False, 'error': str(e)}
