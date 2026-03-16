
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from embeddings.services import VectorStoreService

vector_service = VectorStoreService()
collection = vector_service._get_collection()

print(f"Collection count: {collection.count()}")
results = collection.get(limit=5, include=['metadatas', 'documents'])

for i in range(len(results['ids'])):
    print(f"ID: {results['ids'][i]}")
    print(f"Metadata: {results['metadatas'][i]}")
    print(f"Document: {results['documents'][i][:50]}...")
    print("-" * 20)
