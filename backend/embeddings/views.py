"""
Views for the embeddings app.
"""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .services import VectorStoreService, RAGService
from .models import SearchQuery


class SemanticSearchView(APIView):
    """
    Perform semantic search across user's documents.
    """
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'query': openapi.Schema(type=openapi.TYPE_STRING, description='Search query'),
                'document_ids': openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Schema(type=openapi.TYPE_STRING),
                    description='Optional list of document IDs to search within'
                ),
                'n_results': openapi.Schema(
                    type=openapi.TYPE_INTEGER,
                    description='Number of results (default: 5)',
                    default=5
                ),
            },
            required=['query']
        ),
        responses={200: 'Search results'}
    )
    def post(self, request):
        query = request.data.get('query', '').strip()
        if not query:
            return Response({
                'success': False,
                'error': 'Query is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        document_ids = request.data.get('document_ids', [])
        n_results = min(request.data.get('n_results', 5), 20)  # Cap at 20

        # Validate document IDs belong to user
        if document_ids:
            from documents.models import Document
            user_doc_ids = list(
                Document.objects.filter(
                    user=request.user,
                    id__in=document_ids
                ).values_list('id', flat=True)
            )
            document_ids = [str(d) for d in user_doc_ids]
        else:
            # Search all user's documents
            from documents.models import Document
            document_ids = [
                str(d) for d in Document.objects.filter(
                    user=request.user,
                    status='completed'
                ).values_list('id', flat=True)
            ]

        if not document_ids:
            return Response({
                'success': True,
                'data': {
                    'query': query,
                    'results': [],
                    'message': 'No documents available for search'
                }
            })

        import time
        start_time = time.time()

        # Perform search
        rag_service = RAGService()
        results = rag_service.retrieve_context(
            query=query,
            document_ids=document_ids,
            n_results=n_results
        )

        search_time_ms = int((time.time() - start_time) * 1000)

        # Record search query for analytics
        SearchQuery.objects.create(
            user=request.user,
            query_text=query,
            results_count=len(results),
            search_time_ms=search_time_ms,
            document_ids=document_ids,
        )

        # Format response
        citations = rag_service.get_citations(results)

        return Response({
            'success': True,
            'data': {
                'query': query,
                'results': citations,
                'search_time_ms': search_time_ms,
                'total_results': len(results),
            }
        })


class VectorStoreStatsView(APIView):
    """
    Get statistics about the vector store.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        vector_service = VectorStoreService()
        stats = vector_service.get_collection_stats()

        # Add user-specific stats
        from documents.models import Document, DocumentChunk
        user_docs = Document.objects.filter(user=request.user, status='completed')
        total_chunks = DocumentChunk.objects.filter(
            document__user=request.user,
            has_embedding=True
        ).count()

        stats['user_stats'] = {
            'documents': user_docs.count(),
            'chunks_with_embeddings': total_chunks,
        }

        return Response({
            'success': True,
            'data': stats
        })


class RebuildEmbeddingsView(APIView):
    """
    Trigger rebuild of embeddings for a document.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, document_id):
        from documents.models import Document

        try:
            document = Document.objects.get(id=document_id, user=request.user)
        except Document.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Document not found'
            }, status=status.HTTP_404_NOT_FOUND)

        from .tasks import rebuild_embeddings_task
        rebuild_embeddings_task.delay(str(document_id))

        return Response({
            'success': True,
            'message': 'Embedding rebuild started'
        })
