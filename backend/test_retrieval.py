
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from documents.models import Document
from embeddings.services import RAGService

rag_service = RAGService()

# Get the first document
doc = Document.objects.filter(title='python.pdf').first()
if not doc:
    print("Document not found")
    exit()

document_ids = [str(doc.id)]
queries = [
    "what is attached document is regarding?",
    "python",
    "programming",
    "introduction"
]

for query in queries:
    print(f"\nQuery: '{query}'")
    results = rag_service.retrieve_context(query=query, document_ids=document_ids, n_results=5, min_score=0.0) # Set to 0 to see all scores
    print(f"Total results found: {len(results)}")
    for i, res in enumerate(results):
        print(f"  Result {i+1}: Score={res.get('score')}")
        print(f"  Content Preview: {res.get('content')[:100]}...")
