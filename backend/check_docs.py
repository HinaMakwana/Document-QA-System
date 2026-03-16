
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from documents.models import Document, DocumentChunk
from embeddings.models import EmbeddingRecord

print(f"Total Documents: {Document.objects.count()}")
for doc in Document.objects.all():
    print(f"Document ID: {doc.id}")
    print(f"  Title: {doc.title}")
    print(f"  Status: {doc.status}")
    print(f"  Status Message: {doc.status_message}")
    print(f"  Chunk Count: {doc.chunk_count}")

    chunks = DocumentChunk.objects.filter(document=doc)
    chunks_with_embedding = chunks.filter(has_embedding=True).count()
    print(f"  Chunks with embeddings: {chunks_with_embedding}/{chunks.count()}")

    records = EmbeddingRecord.objects.filter(chunk__document=doc).count()
    print(f"  Embedding Records: {records}")
    print("-" * 20)
