"""
Views for the documents app.
"""
from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import Document, DocumentChunk
from .serializers import (
    DocumentListSerializer,
    DocumentDetailSerializer,
    DocumentUploadSerializer,
    DocumentUpdateSerializer,
    DocumentProcessingStatusSerializer,
    DocumentChunkSerializer,
)
from .tasks import process_document_task
from analytics.services import AnalyticsService


class DocumentListCreateView(generics.ListCreateAPIView):
    """
    List all documents or upload a new document.

    GET: List all documents for the authenticated user
    POST: Upload a new document (multipart/form-data)
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DocumentUploadSerializer
        return DocumentListSerializer

    @swagger_auto_schema(
        operation_description="Upload a new document (PDF, DOCX, DOC, or TXT)",
        manual_parameters=[
            openapi.Parameter(
                'file', openapi.IN_FORM, type=openapi.TYPE_FILE,
                description='Document file to upload', required=True
            ),
            openapi.Parameter(
                'title', openapi.IN_FORM, type=openapi.TYPE_STRING,
                description='Document title'
            ),
            openapi.Parameter(
                'description', openapi.IN_FORM, type=openapi.TYPE_STRING,
                description='Document description'
            ),
        ],
        responses={
            201: DocumentDetailSerializer,
            400: 'Validation error',
        }
    )
    def post(self, request, *args, **kwargs):
        # Check document limit
        user = request.user
        current_count = Document.objects.filter(user=user).count()

        if current_count >= user.max_documents:
            return Response({
                'success': False,
                'error': {
                    'code': 400,
                    'message': f'Document limit reached. You can have up to {user.max_documents} documents.',
                    'current_count': current_count,
                    'limit': user.max_documents,
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(data=request.data)
        with transaction.atomic():
            serializer.is_valid(raise_exception=True)
            document = serializer.save()

            # Trigger async processing only after the database transaction commits
            transaction.on_commit(lambda: process_document_task.delay(str(document.id)))

        # Log analytics outside of transaction
        AnalyticsService().log_usage(
            user=request.user,
            event_type='upload',
            tokens_used=0,
            metadata={'document_id': str(document.id), 'file_type': document.file_type},
            endpoint=request.path,
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        return Response({
            'success': True,
            'message': 'Document uploaded successfully. Processing started.',
            'data': DocumentDetailSerializer(document, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)



class DocumentDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a document.

    GET: Get document details including chunks
    PATCH/PUT: Update document metadata
    DELETE: Delete document and all related data
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Document.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return DocumentUpdateSerializer
        return DocumentDetailSerializer

    def destroy(self, request, *args, **kwargs):
        document = self.get_object()
        document_id = str(document.id)
        document.delete()

        # Also delete from vector store
        from embeddings.services import VectorStoreService
        try:
            vector_service = VectorStoreService()
            vector_service.delete_document(document_id)
        except Exception as e:
            pass  # Continue even if vector deletion fails

        return Response({
            'success': True,
            'message': 'Document deleted successfully'
        }, status=status.HTTP_200_OK)


class DocumentProcessingStatusView(APIView):
    """
    Get document processing status.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            document = Document.objects.get(id=pk, user=request.user)
        except Document.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Document not found'
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'success': True,
            'data': DocumentProcessingStatusSerializer(document).data
        })


class DocumentChunkListView(generics.ListAPIView):
    """
    List all chunks for a document.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = DocumentChunkSerializer

    def get_queryset(self):
        document_id = self.kwargs.get('document_id')
        return DocumentChunk.objects.filter(
            document_id=document_id,
            document__user=self.request.user
        ).order_by('chunk_index')


class DocumentReprocessView(APIView):
    """
    Reprocess a failed or completed document.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            document = Document.objects.get(id=pk, user=request.user)
        except Document.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Document not found'
            }, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            # Delete existing chunks
            document.chunks.all().delete()

            # Reset status
            document.status = Document.Status.PENDING
            document.status_message = ''
            document.chunk_count = 0
            document.save()

            # Trigger processing after commit
            transaction.on_commit(lambda: process_document_task.delay(str(document.id)))

        return Response({
            'success': True,
            'message': 'Document reprocessing started',
            'data': DocumentProcessingStatusSerializer(document).data
        })
