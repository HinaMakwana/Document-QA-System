"""
WebSocket consumers for real-time chat.
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async

logger = logging.getLogger('ai_doc')


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time chat with streaming responses.
    """

    async def connect(self):
        """Handle WebSocket connection."""
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'
        self.user = self.scope.get('user')

        # Check authentication
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        # Verify conversation ownership
        if not await self.verify_conversation():
            await self.close(code=4003)
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Send connection confirmation
        await self.send(text_data=json.dumps({
            'type': 'connection_established',
            'conversation_id': self.conversation_id,
        }))

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Handle incoming messages."""
        try:
            data = json.loads(text_data)
            message_type = data.get('type', 'message')

            if message_type == 'message':
                await self.handle_chat_message(data)
            elif message_type == 'typing':
                await self.handle_typing(data)
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))

        except json.JSONDecodeError:
            await self.send_error('Invalid JSON')
        except Exception as e:
            logger.error(f"WebSocket error: {str(e)}")
            await self.send_error(str(e))

    async def handle_chat_message(self, data):
        """Process incoming chat message and stream response."""
        message = data.get('message', '').strip()

        if not message:
            await self.send_error('Message is required')
            return

        # Send typing indicator
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'is_typing': True,
            }
        )

        try:
            # Get response with streaming
            response = await self.generate_streaming_response(message)

            # Send complete response
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': response,
                }
            )

        finally:
            # Stop typing indicator
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_indicator',
                    'is_typing': False,
                }
            )

    async def handle_typing(self, data):
        """Handle typing indicator."""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'user_id': str(self.user.id),
                'is_typing': data.get('is_typing', False),
            }
        )

    async def chat_message(self, event):
        """Send chat message to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'message',
            'data': event['message'],
        }))

    async def chat_stream(self, event):
        """Send streaming chunk to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'stream',
            'chunk': event['chunk'],
            'is_complete': event.get('is_complete', False),
        }))

    async def typing_indicator(self, event):
        """Send typing indicator to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'is_typing': event['is_typing'],
        }))

    async def send_error(self, error_message):
        """Send error message to WebSocket."""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'error': error_message,
        }))

    @database_sync_to_async
    def verify_conversation(self):
        """Verify that the conversation belongs to the user."""
        from .models import Conversation
        return Conversation.objects.filter(
            id=self.conversation_id,
            user=self.user
        ).exists()

    @database_sync_to_async
    def generate_streaming_response(self, message):
        """Generate response using conversation service."""
        from .models import Conversation
        from .services import ConversationService, InputValidator

        # Validate input
        validation = InputValidator.validate_message(message)
        if not validation['valid']:
            return {'error': validation['error']}

        conversation = Conversation.objects.get(id=self.conversation_id)

        # Check token limits
        if not self.user.can_use_tokens(100):
            return {'error': 'Token limit exceeded'}

        # Generate response
        service = ConversationService()
        result = service.generate_response(
            conversation=conversation,
            user_message=message,
        )

        return result
