"""
Chat-based document upload views.
Upload documents directly from the chat interface with daily per-user limits.
"""
import logging
from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Document
from .serializers import DocumentUploadSerializer, DocumentDetailSerializer
from .tasks import process_document_task
from analytics.services import AnalyticsService
from conversations.models import Conversation

logger = logging.getLogger('ai_doc')


def get_daily_upload_count(user):
    """Get the number of documents uploaded by this user today."""
    today = timezone.now().date()
    return Document.objects.filter(
        user=user,
        created_at__date=today
    ).count()


def get_daily_upload_limit():
    """Get the daily upload limit from settings."""
    from django.conf import settings
    return getattr(settings, 'DAILY_UPLOAD_LIMIT', 4)


class ChatDocumentUploadView(APIView):
    """
    Upload a document directly from the chat interface.

    POST: Upload a file and auto-attach it to a conversation.
    Enforces a daily per-user upload limit.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        user = request.user
        conversation_id = request.data.get('conversation_id')

        # Validate conversation_id
        if not conversation_id:
            return Response({
                'success': False,
                'error': {
                    'code': 400,
                    'message': 'conversation_id is required.',
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            conversation = Conversation.objects.get(id=conversation_id, user=user)
        except Conversation.DoesNotExist:
            return Response({
                'success': False,
                'error': {
                    'code': 404,
                    'message': 'Conversation not found.',
                }
            }, status=status.HTTP_404_NOT_FOUND)

        # Check daily upload limit
        daily_limit = get_daily_upload_limit()
        uploads_today = get_daily_upload_count(user)

        if uploads_today >= daily_limit:
            return Response({
                'success': False,
                'error': {
                    'code': 429,
                    'message': f'Daily upload limit reached. You can upload up to {daily_limit} documents per day.',
                    'uploads_today': uploads_today,
                    'daily_limit': daily_limit,
                    'remaining': 0,
                }
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Check total document limit
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

        # Validate and create document
        serializer = DocumentUploadSerializer(
            data=request.data,
            context={'request': request}
        )

        with transaction.atomic():
            serializer.is_valid(raise_exception=True)
            document = serializer.save()

            # Auto-attach to conversation
            conversation.documents.add(document)

            # Trigger async processing
            transaction.on_commit(lambda: process_document_task.delay(str(document.id)))

        # Log analytics
        AnalyticsService().log_usage(
            user=user,
            event_type='upload',
            tokens_used=0,
            metadata={
                'document_id': str(document.id),
                'file_type': document.file_type,
                'source': 'chat',
                'conversation_id': str(conversation_id),
            },
            endpoint=request.path,
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        # Get updated quota
        new_uploads_today = uploads_today + 1

        return Response({
            'success': True,
            'message': 'Document uploaded successfully. Processing started.',
            'data': {
                **DocumentDetailSerializer(document, context={'request': request}).data,
                'quota': {
                    'uploads_today': new_uploads_today,
                    'daily_limit': daily_limit,
                    'remaining': max(0, daily_limit - new_uploads_today),
                },
            }
        }, status=status.HTTP_201_CREATED)


class UploadQuotaView(APIView):
    """
    Get the user's current upload quota for today.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        daily_limit = get_daily_upload_limit()
        uploads_today = get_daily_upload_count(request.user)

        return Response({
            'success': True,
            'data': {
                'uploads_today': uploads_today,
                'daily_limit': daily_limit,
                'remaining': max(0, daily_limit - uploads_today),
            }
        })
