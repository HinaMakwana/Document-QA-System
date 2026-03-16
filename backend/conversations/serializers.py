"""
Serializers for the conversations app.
"""
from rest_framework import serializers
from .models import Conversation, Message, ConversationFeedback


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for messages."""

    class Meta:
        model = Message
        fields = [
            'id', 'role', 'content', 'tokens_used',
            'model_used', 'response_time_ms', 'citations',
            'is_error', 'error_message', 'created_at'
        ]


class ConversationListSerializer(serializers.ModelSerializer):
    """Serializer for conversation list."""

    last_message_preview = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'title', 'description',
            'total_tokens_used', 'total_messages',
            'last_message_preview', 'document_count',
            'created_at', 'updated_at', 'last_message_at'
        ]

    def get_last_message_preview(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return last_msg.content[:100] + '...' if len(last_msg.content) > 100 else last_msg.content
        return None

    def get_document_count(self, obj):
        return obj.documents.count()


class ConversationDetailSerializer(serializers.ModelSerializer):
    """Serializer for conversation detail."""

    messages = MessageSerializer(many=True, read_only=True)
    document_ids = serializers.PrimaryKeyRelatedField(
        source='documents',
        many=True,
        read_only=True
    )

    class Meta:
        model = Conversation
        fields = [
            'id', 'title', 'description', 'system_prompt',
            'temperature', 'max_tokens',
            'total_tokens_used', 'total_messages',
            'document_ids', 'messages',
            'is_active', 'created_at', 'updated_at', 'last_message_at'
        ]


class ConversationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating conversations."""

    document_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        write_only=True
    )

    class Meta:
        model = Conversation
        fields = [
            'title', 'description', 'system_prompt',
            'temperature', 'max_tokens', 'document_ids'
        ]

    def validate_document_ids(self, value):
        """Validate that documents belong to the user."""
        if not value:
            return value

        from documents.models import Document
        user = self.context['request'].user

        valid_docs = Document.objects.filter(
            id__in=value,
            user=user,
            status='completed'
        ).values_list('id', flat=True)

        if len(valid_docs) != len(value):
            raise serializers.ValidationError(
                "Some documents not found or not accessible"
            )

        return value

    def create(self, validated_data):
        document_ids = validated_data.pop('document_ids', [])

        conversation = Conversation.objects.create(
            user=self.context['request'].user,
            **validated_data
        )

        if document_ids:
            from documents.models import Document
            documents = Document.objects.filter(id__in=document_ids)
            conversation.documents.set(documents)

        return conversation


class ConversationUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating conversations."""

    document_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        write_only=True
    )

    class Meta:
        model = Conversation
        fields = [
            'title', 'description', 'system_prompt',
            'temperature', 'max_tokens', 'is_active',
            'document_ids'
        ]

    def update(self, instance, validated_data):
        document_ids = validated_data.pop('document_ids', None)

        # Update fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update documents via document_ids (full replacement)
        if document_ids is not None:
            from documents.models import Document
            docs = Document.objects.filter(
                id__in=document_ids,
                user=instance.user,
                status='completed'
            )
            instance.documents.set(docs)

        return instance


class ChatMessageSerializer(serializers.Serializer):
    """Serializer for sending chat messages."""

    message = serializers.CharField(required=True, max_length=10000)
    include_context = serializers.BooleanField(default=True)
    n_context_results = serializers.IntegerField(default=5, min_value=1, max_value=20)


class FeedbackSerializer(serializers.ModelSerializer):
    """Serializer for conversation feedback."""

    class Meta:
        model = ConversationFeedback
        fields = ['id', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        return ConversationFeedback.objects.create(
            user=self.context['request'].user,
            message=self.context['message'],
            **validated_data
        )
