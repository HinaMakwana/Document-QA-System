"""
LangChain service with Gemini integration.
"""
import logging
import time
from typing import List, Dict, Any, Optional, Generator

from django.conf import settings

logger = logging.getLogger('ai_doc')


class PromptTemplates:
    """Collection of prompt templates for different use cases."""

    SYSTEM_PROMPT = """You are an intelligent AI assistant. Your role is to help users with their queries, focusing on any provided document context whenever available.

Guidelines:
1. If document context is provided, prioritize answering based on that information.
2. When using document context, always cite your sources by referencing the document and section.
3. If no document context is provided, or the provided context doesn't contain the answer, use your general knowledge to provide a helpful and accurate response.
4. Be concise but thorough.
5. Format your responses clearly with bullet points or numbered lists when appropriate."""

    CONVERSATION_PROMPT = """Documents attached to this conversation:
{document_info}

Previous conversation:
{history}

---

Context from documents:
{context}

---

User's question: {question}

Please provide a helpful response based on the conversation history and document context."""

    RAG_PROMPT = """Documents attached to this conversation:
{document_info}

Context from your documents:
{context}

---

Based on the above context from your documents, please answer the following question.
If the context doesn't contain relevant information, let me know.

Question: {question}"""

    SUMMARIZE_PROMPT = """Please summarize the following document content:

{content}

Provide a concise summary highlighting the key points, main themes, and important details."""


class LLMService:
    """Service for LLM interactions using Gemini."""

    _instance = None
    _model = None
    _initialized_api_key = None  # Track which key was used to init the model
    _initialized_model_name = None  # Track which model name was used

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        self.api_key = getattr(settings, 'GEMINI_API_KEY', '')
        self.model_name = getattr(settings, 'GEMINI_MODEL', 'gemini-2.0-flash')
        self.max_tokens = getattr(settings, 'MAX_TOKENS_PER_REQUEST', 4096)
        self.temperature = 0.7

    def _get_model(self):
        """Initialize or reinitialize Gemini model if config has changed."""
        # Reinitialize if api_key or model_name changed since last init
        config_changed = (
            self.__class__._initialized_api_key != self.api_key or
            self.__class__._initialized_model_name != self.model_name
        )
        if self._model is None or config_changed:
            try:
                import google.generativeai as genai

                if not self.api_key:
                    raise ValueError("GEMINI_API_KEY not configured")

                genai.configure(api_key=self.api_key)

                generation_config = {
                    "temperature": self.temperature,
                    "max_output_tokens": self.max_tokens,
                    "top_p": 0.95,
                    "top_k": 40,
                }

                safety_settings = [
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                ]

                self.__class__._model = genai.GenerativeModel(
                    model_name=self.model_name,
                    generation_config=generation_config,
                    safety_settings=safety_settings,
                )
                # Record what config was used for this model instance
                self.__class__._initialized_api_key = self.api_key
                self.__class__._initialized_model_name = self.model_name

                logger.info(f"Initialized Gemini model: {self.model_name}")

            except ImportError:
                logger.error("google-generativeai not installed")
                raise ImportError("Please install google-generativeai: pip install google-generativeai")

        return self._model

    def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Generate a response from the LLM.

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            temperature: Optional temperature override
            max_tokens: Optional max tokens override

        Returns:
            Dict with response content and metadata
        """
        start_time = time.time()

        try:
            model = self._get_model()

            # Combine system prompt with user prompt
            full_prompt = prompt
            if system_prompt:
                full_prompt = f"{system_prompt}\n\n{prompt}"

            # Generate response
            response = model.generate_content(full_prompt)

            response_time = int((time.time() - start_time) * 1000)

            # Extract text from response
            if response.candidates and len(response.candidates) > 0:
                text = response.candidates[0].content.parts[0].text
            else:
                text = "I apologize, but I couldn't generate a response. Please try again."

            # Estimate token usage (Gemini doesn't always provide this)
            input_tokens = len(prompt.split()) * 1.3  # Rough estimate
            output_tokens = len(text.split()) * 1.3

            return {
                'success': True,
                'content': text,
                'model': self.model_name,
                'tokens': {
                    'input': int(input_tokens),
                    'output': int(output_tokens),
                    'total': int(input_tokens + output_tokens),
                },
                'response_time_ms': response_time,
            }

        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'content': f"Error: {str(e)}",
                'model': self.model_name,
                'tokens': {'input': 0, 'output': 0, 'total': 0},
                'response_time_ms': int((time.time() - start_time) * 1000),
            }

    def generate_stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> Generator[str, None, None]:
        """
        Generate a streaming response from the LLM.

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt

        Yields:
            Text chunks as they are generated
        """
        try:
            model = self._get_model()

            full_prompt = prompt
            if system_prompt:
                full_prompt = f"{system_prompt}\n\n{prompt}"

            response = model.generate_content(full_prompt, stream=True)

            for chunk in response:
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            logger.error(f"Error in streaming response: {str(e)}")
            yield f"Error: {str(e)}"

    def estimate_tokens(self, text: str) -> int:
        """Estimate token count for text."""
        # Rough estimation for Gemini
        return int(len(text.split()) * 1.3)


class ConversationService:
    """Service for managing conversations and generating responses."""

    def __init__(self):
        self.llm_service = LLMService()

        # Import here to avoid circular imports
        from embeddings.services import RAGService
        self.rag_service = RAGService()

    def generate_response(
        self,
        conversation,
        user_message: str,
        include_context: bool = True,
        n_context_results: int = 5,
    ) -> Dict[str, Any]:
        """
        Generate a response for a user message in a conversation.

        Args:
            conversation: Conversation model instance
            user_message: User's question/message
            include_context: Whether to include RAG context
            n_context_results: Number of context chunks to retrieve

        Returns:
            Dict with response and metadata
        """
        from .models import Message
        from django.utils import timezone

        # Get conversation history
        history = conversation.get_conversation_history(limit=10)
        history_text = self._format_history(history)

        # Get document context if enabled
        context = ""
        citations = []

        if include_context:
            document_ids = list(
                conversation.documents.values_list('id', flat=True)
            )

            if document_ids:
                # Retrieve relevant context
                results = self.rag_service.retrieve_context(
                    query=user_message,
                    document_ids=[str(d) for d in document_ids],
                    n_results=n_context_results,
                )

                if results:
                    context = self.rag_service.format_context(results)
                    citations = self.rag_service.get_citations(results)
                else:
                    # Fallback: Get introductory chunks if RAG failed but documents exist
                    logger.info(f"RAG returned no results for broad query. Using fallback context.")
                    fallback_results = self.rag_service.fetch_intro_chunks(
                        document_ids=[str(d) for d in document_ids],
                        n_chunks_per_doc=2
                    )
                    if fallback_results:
                        context = self.rag_service.format_context(fallback_results)
                        # We don't necessarily want citations for fallback context in the same way,
                        # but RAG templates expect source labels.
                        citations = self.rag_service.get_citations(fallback_results)

        # Build document info overview
        document_info = "None"
        attached_docs = conversation.documents.all()
        if attached_docs.exists():
            doc_titles = [doc.title for doc in attached_docs]
            document_info = ", ".join(doc_titles)

        # Build prompt
        if history_text and context:
            prompt = PromptTemplates.CONVERSATION_PROMPT.format(
                document_info=document_info,
                history=history_text,
                context=context,
                question=user_message
            )
        elif history_text:
            # Multi-turn conversation without document context
            prompt = f"Documents attached: {document_info}\n\nPrevious conversation:\n{history_text}\n\n---\n\nUser's question: {user_message}"
        elif context:
            # Single-turn RAG
            prompt = PromptTemplates.RAG_PROMPT.format(
                document_info=document_info,
                context=context,
                question=user_message
            )
        else:
            # Single-turn general question
            prompt = f"Documents attached: {document_info}\n\nUser's question: {user_message}"

        # Get system prompt
        system_prompt = conversation.system_prompt or PromptTemplates.SYSTEM_PROMPT

        # Generate response
        result = self.llm_service.generate_response(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=conversation.temperature,
            max_tokens=conversation.max_tokens,
        )

        # Save user message
        user_msg = Message.objects.create(
            conversation=conversation,
            role=Message.Role.USER,
            content=user_message,
        )

        # Save assistant message
        assistant_msg = Message.objects.create(
            conversation=conversation,
            role=Message.Role.ASSISTANT,
            content=result['content'],
            tokens_used=result['tokens']['total'],
            model_used=result['model'],
            response_time_ms=result['response_time_ms'],
            citations=citations,
            is_error=not result['success'],
            error_message=result.get('error', ''),
        )

        # Update conversation
        conversation.total_tokens_used += result['tokens']['total']
        conversation.total_messages += 2
        conversation.last_message_at = timezone.now()

        # Auto-generate title if first message
        if conversation.total_messages <= 2 and conversation.title == 'New Conversation':
            conversation.title = self._generate_title(user_message)

        conversation.save()

        # Update user token usage
        conversation.user.add_token_usage(result['tokens']['total'])

        return {
            'success': result['success'],
            'message': {
                'id': str(assistant_msg.id),
                'role': assistant_msg.role,
                'content': assistant_msg.content,
                'tokens_used': assistant_msg.tokens_used,
                'response_time_ms': assistant_msg.response_time_ms,
                'citations': citations,
                'created_at': assistant_msg.created_at.isoformat(),
            },
            'conversation': {
                'id': str(conversation.id),
                'title': conversation.title,
                'total_tokens_used': conversation.total_tokens_used,
                'total_messages': conversation.total_messages,
            },
        }

    def _format_history(self, history: List[Dict]) -> str:
        """Format conversation history for prompt."""
        if not history:
            return ""

        formatted = []
        for msg in history:
            role = msg['role'].capitalize()
            content = msg['content'][:500]  # Limit length
            formatted.append(f"{role}: {content}")

        return "\n".join(formatted)

    def _generate_title(self, first_message: str) -> str:
        """Generate a title from the first message."""
        # Simple title generation - take first 50 chars
        title = first_message[:50].strip()
        if len(first_message) > 50:
            title += "..."
        return title


class InputValidator:
    """Validate and sanitize user input to prevent prompt injection."""

    BLOCKED_PATTERNS = [
        "ignore previous instructions",
        "ignore above instructions",
        "disregard previous",
        "forget your instructions",
        "new instructions:",
        "system prompt:",
        "you are now",
        "pretend you are",
        "act as if",
    ]

    MAX_MESSAGE_LENGTH = 10000

    @classmethod
    def validate_message(cls, message: str) -> Dict[str, Any]:
        """
        Validate user message for safety.

        Returns:
            Dict with 'valid' boolean and 'error' message if invalid
        """
        if not message or not message.strip():
            return {'valid': False, 'error': 'Message cannot be empty'}

        if len(message) > cls.MAX_MESSAGE_LENGTH:
            return {
                'valid': False,
                'error': f'Message too long. Maximum {cls.MAX_MESSAGE_LENGTH} characters.'
            }

        # Check for prompt injection patterns
        message_lower = message.lower()
        for pattern in cls.BLOCKED_PATTERNS:
            if pattern in message_lower:
                logger.warning(f"Blocked potential prompt injection: {pattern}")
                return {
                    'valid': False,
                    'error': 'Message contains disallowed content'
                }

        return {'valid': True}

    @classmethod
    def sanitize_message(cls, message: str) -> str:
        """Sanitize message by removing potentially harmful content."""
        # Remove excessive whitespace
        message = ' '.join(message.split())

        # Limit length
        if len(message) > cls.MAX_MESSAGE_LENGTH:
            message = message[:cls.MAX_MESSAGE_LENGTH]

        return message.strip()
