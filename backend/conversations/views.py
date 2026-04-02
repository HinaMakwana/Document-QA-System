"""
Views for the conversations app.
"""
import json
from django.http import StreamingHttpResponse
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import Conversation, Message, ConversationFeedback
from .serializers import (
    ConversationListSerializer,
    ConversationDetailSerializer,
    ConversationCreateSerializer,
    ConversationUpdateSerializer,
    ChatMessageSerializer,
    MessageSerializer,
    FeedbackSerializer,
)
from .services import ConversationService, InputValidator
from analytics.services import AnalyticsService


class ConversationListCreateView(generics.ListCreateAPIView):
    """
    List all conversations or create a new conversation.

    GET: List all conversations for the authenticated user
    POST: Create a new conversation
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ConversationCreateSerializer
        return ConversationListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation = serializer.save()

        return Response({
            'success': True,
            'message': 'Conversation created successfully',
            'data': ConversationDetailSerializer(conversation).data
        }, status=status.HTTP_201_CREATED)


class ConversationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a conversation.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return ConversationUpdateSerializer
        return ConversationDetailSerializer

    def destroy(self, request, *args, **kwargs):
        conversation = self.get_object()
        conversation.delete()

        return Response({
            'success': True,
            'message': 'Conversation deleted successfully'
        })


class ChatView(APIView):
    """
    Send a message in a conversation and get AI response.
    """
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        request_body=ChatMessageSerializer,
        responses={200: 'AI response with citations'}
    )
    def post(self, request, pk):
        # Get conversation
        try:
            conversation = Conversation.objects.get(
                id=pk,
                user=request.user
            )
        except Conversation.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Conversation not found'
            }, status=status.HTTP_404_NOT_FOUND)

        # Validate input
        serializer = ChatMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_message = serializer.validated_data['message']
        include_context = serializer.validated_data.get('include_context', True)
        n_context_results = serializer.validated_data.get('n_context_results', 5)

        # Validate message for safety
        validation = InputValidator.validate_message(user_message)
        if not validation['valid']:
            return Response({
                'success': False,
                'error': validation['error']
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check token limits
        if not request.user.can_use_tokens(100):  # Rough estimate
            return Response({
                'success': False,
                'error': 'Token limit exceeded. Please try again later or upgrade your plan.'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Sanitize message
        user_message = InputValidator.sanitize_message(user_message)

        # Generate response
        service = ConversationService()
        result = service.generate_response(
            conversation=conversation,
            user_message=user_message,
            include_context=include_context,
            n_context_results=n_context_results,
        )

        # Log usage analytics
        if result.get('success'):
            tokens_used = result.get('message', {}).get('tokens_used', 0)
            response_time_ms = result.get('message', {}).get('response_time_ms', 0)
            AnalyticsService().log_usage(
                user=request.user,
                event_type='chat',
                tokens_used=tokens_used,
                processing_time_ms=response_time_ms,
                metadata={'conversation_id': str(pk)},
                endpoint=request.path,
                ip_address=request.META.get('REMOTE_ADDR'),
            )

        return Response({
            'success': result['success'],
            'data': result
        })


class ConversationMessagesView(generics.ListAPIView):
    """
    List messages in a conversation.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MessageSerializer

    def get_queryset(self):
        conversation_id = self.kwargs.get('pk')
        return Message.objects.filter(
            conversation_id=conversation_id,
            conversation__user=self.request.user
        ).order_by('created_at')


class ConversationClearView(APIView):
    """
    Clear all messages in a conversation.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            conversation = Conversation.objects.get(
                id=pk,
                user=request.user
            )
        except Conversation.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Conversation not found'
            }, status=status.HTTP_404_NOT_FOUND)

        # Delete all messages
        deleted_count = conversation.messages.all().delete()[0]

        # Reset counters
        conversation.total_messages = 0
        conversation.total_tokens_used = 0
        conversation.last_message_at = None
        conversation.save()

        return Response({
            'success': True,
            'message': f'Cleared {deleted_count} messages'
        })


class MessageFeedbackView(APIView):
    """
    Submit feedback for a message.
    """
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        request_body=FeedbackSerializer,
        responses={201: FeedbackSerializer}
    )
    def post(self, request, message_id):
        try:
            message = Message.objects.get(
                id=message_id,
                conversation__user=request.user,
                role='assistant'
            )
        except Message.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Message not found'
            }, status=status.HTTP_404_NOT_FOUND)

        # Check if feedback already exists
        if hasattr(message, 'feedback'):
            return Response({
                'success': False,
                'error': 'Feedback already submitted'
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = FeedbackSerializer(
            data=request.data,
            context={'request': request, 'message': message}
        )
        serializer.is_valid(raise_exception=True)
        feedback = serializer.save()

        return Response({
            'success': True,
            'data': FeedbackSerializer(feedback).data
        }, status=status.HTTP_201_CREATED)


class QuickQuestionView(APIView):
    """
    Ask a quick question without creating a full conversation.
    Creates a temporary conversation, gets response, and returns result.
    """
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'question': openapi.Schema(type=openapi.TYPE_STRING),
                'document_ids': openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Schema(type=openapi.TYPE_STRING)
                ),
            },
            required=['question']
        ),
        responses={200: 'AI response'}
    )
    def post(self, request):
        question = request.data.get('question', '').strip()
        document_ids = request.data.get('document_ids', [])

        if not question:
            return Response({
                'success': False,
                'error': 'Question is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate input
        validation = InputValidator.validate_message(question)
        if not validation['valid']:
            return Response({
                'success': False,
                'error': validation['error']
            }, status=status.HTTP_400_BAD_REQUEST)

        # Check token limits
        if not request.user.can_use_tokens(100):
            return Response({
                'success': False,
                'error': 'Token limit exceeded'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        # Create temporary conversation
        conversation = Conversation.objects.create(
            user=request.user,
            title='Quick Question',
            description='Auto-generated quick question conversation'
        )

        # Add documents if specified
        if document_ids:
            from documents.models import Document
            docs = Document.objects.filter(
                id__in=document_ids,
                user=request.user,
                status='completed'
            )
            conversation.documents.set(docs)

        # Generate response
        service = ConversationService()
        result = service.generate_response(
            conversation=conversation,
            user_message=question,
            include_context=bool(document_ids),
        )

        # Include conversation ID for reference
        result['conversation_id'] = str(conversation.id)

        return Response({
            'success': result['success'],
            'data': result
        })


class ChatStreamView(APIView):
    """
    Stream an AI response via Server-Sent Events (SSE).

    POST body: { "message": "...", "include_context": true }
    Response: text/event-stream with chunks, then a final [DONE] event with citations.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        """Start a streaming chat response."""
        # Validate conversation ownership
        try:
            conversation = Conversation.objects.get(id=pk, user=request.user)
        except Conversation.DoesNotExist:
            return Response({
                'success': False, 'error': 'Conversation not found'
            }, status=status.HTTP_404_NOT_FOUND)

        message = request.data.get('message', '').strip()
        include_context = request.data.get('include_context', True)

        if not message:
            return Response({
                'success': False, 'error': 'Message is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate and check limits
        validation = InputValidator.validate_message(message)
        if not validation['valid']:
            return Response({
                'success': False, 'error': validation['error']
            }, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.can_use_tokens(100):
            return Response({
                'success': False, 'error': 'Token limit exceeded'
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

        message = InputValidator.sanitize_message(message)

        async def _sse_stream():
            """Async generator yielding SSE-formatted chunks."""
            from .services import LLMService, PromptTemplates
            from embeddings.services import RAGService as EmbeddingRAGService
            from asgiref.sync import sync_to_async

            # Build RAG context
            context = ''
            citations = []
            if include_context:
                document_ids = await sync_to_async(list)(
                    conversation.documents.values_list('id', flat=True)
                )
                if document_ids:
                    rag = EmbeddingRAGService()
                    # sync_to_async for the vector store search
                    results = await sync_to_async(rag.retrieve_context)(
                        query=message,
                        document_ids=[str(d) for d in document_ids],
                        n_results=5,
                    )
                    if results:
                        context = rag.format_context(results)
                        citations = rag.get_citations(results)

            history = await sync_to_async(conversation.get_conversation_history)(limit=10)
            history_text = '\n'.join(
                f"{m['role'].capitalize()}: {m['content'][:500]}" for m in history
            )

            # Use sync_to_async for Querysets
            all_docs = await sync_to_async(list)(conversation.documents.all())
            document_info = ', '.join([d.title for d in all_docs]) or 'None'

            if history_text and context:
                prompt = PromptTemplates.CONVERSATION_PROMPT.format(
                    document_info=document_info,
                    history=history_text,
                    context=context,
                    question=message,
                )
            elif context:
                prompt = PromptTemplates.RAG_PROMPT.format(
                    document_info=document_info,
                    context=context,
                    question=message,
                )
            else:
                prompt = f"Documents: {document_info}\n\nUser: {message}"

            system_prompt = conversation.system_prompt or PromptTemplates.SYSTEM_PROMPT
            llm = LLMService()

            # Send SSE chunks
            full_response = ''
            # LLM generation is sync, wrap the iterator
            for chunk in await sync_to_async(llm.generate_stream)(prompt, system_prompt=system_prompt):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

            # Save messages after streaming completes — wrap in sync_to_async
            async def _save_metadata():
                try:
                    from django.utils import timezone
                    user_msg = await sync_to_async(Message.objects.create)(
                        conversation=conversation,
                        role=Message.Role.USER,
                        content=message,
                    )
                    estimated_tokens = len(full_response.split()) * 2
                    assistant_msg = await sync_to_async(Message.objects.create)(
                        conversation=conversation,
                        role=Message.Role.ASSISTANT,
                        content=full_response,
                        tokens_used=estimated_tokens,
                        model_used=llm.model_name,
                        citations=citations,
                    )
                    conversation.total_messages += 2
                    conversation.total_tokens_used += estimated_tokens
                    conversation.last_message_at = timezone.now()
                    await sync_to_async(conversation.save)(update_fields=[
                        'total_messages', 'total_tokens_used', 'last_message_at'
                    ])
                    # Ensure user token usage is also async-safe if it hits the DB
                    await sync_to_async(request.user.add_token_usage)(estimated_tokens)

                    # Log analytics (sync_to_async within AnalyticsService)
                    await sync_to_async(AnalyticsService().log_usage)(
                        user=request.user,
                        event_type='chat',
                        tokens_used=estimated_tokens,
                        metadata={'conversation_id': str(pk), 'streaming': True},
                        endpoint=request.path,
                        ip_address=request.META.get('REMOTE_ADDR'),
                    )
                except Exception as e:
                    logger.error(f"Error saving stream metadata: {str(e)}")

            # Execute save in background
            import asyncio
            asyncio.create_task(_save_metadata())

            # Final event with metadata
            yield f"data: {json.dumps({'type': 'done', 'citations': citations})}\n\n"

        response = StreamingHttpResponse(
            streaming_content=_sse_stream(),
            content_type='text/event-stream',
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response
