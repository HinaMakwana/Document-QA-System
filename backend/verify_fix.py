
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from documents.models import Document
from conversations.models import Conversation
from conversations.services import ConversationService

# Get a document (preferring python.pdf)
doc = Document.objects.filter(title='python.pdf').first()
if not doc:
    doc = Document.objects.first()

if not doc:
    print("No documents found in DB. Please upload one first.")
    exit()

# Create a test conversation
user = doc.user
conv = Conversation.objects.create(
    user=user,
    title='Test Context Fix'
)
conv.documents.add(doc)

service = ConversationService()

# Test broad query that usually fails RAG
query = "what is the attached document about?"
print(f"\nTesting broad query: '{query}'")

# We mock the LLM response to see the prompt or just check the service logic
# Since we can't easily see the prompt injected into the LLM call without patching,
# we'll look at the Citations and the fact that it doesn't error.

result = service.generate_response(
    conversation=conv,
    user_message=query,
    include_context=True
)

print(f"Success: {result['success']}")
print(f"Assistant Response: {result['message']['content'][:200]}...")
print(f"Citations count: {len(result['message']['citations'])}")

if len(result['message']['citations']) > 0:
    print("STRENGTH: Document context was successfully injected via fallback!")
else:
    print("WEAKNESS: Still no context injected.")

# Cleanup
conv.delete()
