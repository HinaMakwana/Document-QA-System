"""
Serializers for the documents app.
"""
from rest_framework import serializers
from .models import Document, DocumentChunk


class DocumentChunkSerializer(serializers.ModelSerializer):
    """Serializer for document chunks."""

    content_preview = serializers.ReadOnlyField()

    class Meta:
        model = DocumentChunk
        fields = [
            'id', 'chunk_index', 'content', 'content_preview',
            'page_number', 'token_count', 'has_embedding', 'created_at'
        ]


class DocumentListSerializer(serializers.ModelSerializer):
    """Serializer for document list view."""

    file_size_mb = serializers.ReadOnlyField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'description', 'file_type',
            'file_size', 'file_size_mb', 'status', 'status_message',
            'page_count', 'word_count', 'chunk_count',
            'created_at', 'updated_at'
        ]


class DocumentDetailSerializer(serializers.ModelSerializer):
    """Serializer for document detail view."""

    file_size_mb = serializers.ReadOnlyField()
    chunks = DocumentChunkSerializer(many=True, read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'title', 'description', 'file', 'file_url',
            'file_type', 'file_size', 'file_size_mb', 'original_filename',
            'status', 'status_message',
            'page_count', 'word_count', 'chunk_count',
            'processing_started_at', 'processing_completed_at',
            'created_at', 'updated_at', 'chunks'
        ]

    def get_file_url(self, obj):
        if not obj.file:
            return None
        url = obj.file.url
        # If it's already an absolute URL (like Cloudinary), return it directly
        if url.startswith('http'):
            return url
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(url)
        return url


class DocumentUploadSerializer(serializers.ModelSerializer):
    """Serializer for document upload."""

    file = serializers.FileField(required=True)

    class Meta:
        model = Document
        fields = ['title', 'description', 'file']

    def validate_file(self, value):
        """Validate uploaded file."""
        from django.conf import settings

        # Check file extension
        allowed_extensions = ['pdf', 'docx', 'doc', 'txt']
        ext = value.name.split('.')[-1].lower()

        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                f"File type '{ext}' is not supported. Allowed types: {', '.join(allowed_extensions)}"
            )

        # Check file size from settings (default 10MB)
        max_size_mb = getattr(settings, 'MAX_UPLOAD_SIZE_MB', 10)
        max_size = max_size_mb * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size ({value.size / (1024*1024):.2f}MB) exceeds maximum allowed size ({max_size_mb}MB)"
            )

        return value

    def create(self, validated_data):
        """Create document with proper metadata."""
        file = validated_data['file']
        ext = file.name.split('.')[-1].lower()

        # Map extension to file type
        file_type_map = {
            'pdf': Document.FileType.PDF,
            'docx': Document.FileType.DOCX,
            'doc': Document.FileType.DOC,
            'txt': Document.FileType.TXT,
        }

        document = Document.objects.create(
            user=self.context['request'].user,
            title=validated_data.get('title') or file.name,
            description=validated_data.get('description', ''),
            file=file,
            file_type=file_type_map.get(ext, Document.FileType.TXT),
            file_size=file.size,
            original_filename=file.name,
            status=Document.Status.PENDING,
        )

        return document


class DocumentUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating document metadata."""

    class Meta:
        model = Document
        fields = ['title', 'description']


class DocumentProcessingStatusSerializer(serializers.ModelSerializer):
    """Serializer for document processing status."""

    class Meta:
        model = Document
        fields = [
            'id', 'status', 'status_message',
            'page_count', 'word_count', 'chunk_count',
            'processing_started_at', 'processing_completed_at'
        ]
