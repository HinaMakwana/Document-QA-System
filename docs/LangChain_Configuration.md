# LangChain Configuration

This document outlines the LangChain and LLM configuration for the AI Document Q&A System.

## Prompt Templates

The system uses specialized prompt templates managed in `backend/conversations/services.py` to ensure consistent and high-quality AI responses.

### 1. System Prompt (`SYSTEM_PROMPT`)
**Purpose**: Defines the AI's core persona and behavior guidelines.
- **Description**: Instructs the assistant to be intelligent, prioritize document context, cite sources, and maintain a concise yet thorough tone.
- **Key Guidelines**: Citations requirements, formatting instructions (bullet points/numbered lists), and fallback to general knowledge.

### 2. Conversation Prompt (`CONVERSATION_PROMPT`)
**Purpose**: Used for multi-turn conversations where both document context and history are present.
- **Variables**: `{document_info}`, `{history}`, `{context}`, `{question}`.
- **Logic**: Combines attached document titles, previous messages, retrieved RAG context, and the new user question.

### 3. RAG Prompt (`RAG_PROMPT`)
**Purpose**: Optimized for single-turn questions focused strictly on provided documents.
- **Variables**: `{document_info}`, `{context}`, `{question}`.
- **Logic**: Explicitly tells the model to answer based *only* on the context and admit if the information is missing.

### 4. Summarize Prompt (`SUMMARIZE_PROMPT`)
**Purpose**: Used for generating document summaries.
- **Variables**: `{content}`.
- **Logic**: Requests a concise summary highlighting key points and themes.

---

## Chain Configurations

The application implements a custom orchestration layer in the `ConversationService` rather than using standard LangChain `Chain` objects, providing better control over state and database integration.

### Conversation Logic Flow:
1.  **Context Retrieval**: If enabled, uses `RAGService` to find relevant chunks.
2.  **History Formatting**: Formats the last 10 messages for context window management.
3.  **Prompt Selection**: Dynamically selects between `CONVERSATION_PROMPT`, `RAG_PROMPT`, or a general fallback based on the availability of history and context.
4.  **LLM Execution**: Calls `LLMService` (Gemini) with the constructed prompt and system prompt.
5.  **Persistence**: Saves both user and assistant messages to the SQLite/PostgreSQL database.
6.  **Title Generation**: Automatically generates a conversation title from the first message.

---

## RAG Pipeline

The RAG (Retrieval-Augmented Generation) pipeline ensures that the LLM has access to the most relevant information from uploaded documents.

### Pipeline Steps:
1.  **Query Embedding**: The user's query is converted into a vector using the `EmbeddingService`.
2.  **Vector Search**: `VectorStoreService` (ChromaDB) performs a similarity search using cosine distance.
3.  **Filtering**: Results are filtered by a `min_score` (default: 0.1) and limited to `n_results` (default: 5).
4.  **Formatting**: Chunks are formatted into a string with source labels (e.g., `[Source 1: Document.pdf, Page 5]`).
5.  **Citations**: Citation metadata is extracted and returned to the frontend for UI display.
6.  **Fallback**: If no results are found for a broad query, the system fetches the first few "introductory chunks" of the attached documents.

---

## Vector Database Setup

The system utilizes **ChromaDB** as the primary vector store.

- **Storage**: Persistent storage is configured via `CHROMA_PERSIST_DIRECTORY` (default: `./chroma_db`).
- **Collection**: Uses a single collection named `documents` (configurable via `CHROMA_COLLECTION_NAME`).
- **Similarity Metric**: Uses **Cosine Similarity** (`hnsw:space: "cosine"`) for accurate semantic matching.
- **Scaling**: ChromaDB runs as a `PersistentClient`, ensuring data is saved across restarts.

---

## Embedding Strategy

Embeddings are generated locally to ensure privacy and reduce latecy.

- **Model**: `all-MiniLM-L6-v2` from HuggingFace `sentence-transformers`.
- **Dimensions**: 384-dimensional vectors.
- **Platform**: Runs on CPU for maximum compatibility across environments.
- **Efficiency**: Supports bulk embedding generation during document ingestion.
- **Metadata**: Each vector is stored with its `document_id`, `document_title`, `page_number`, and `chunk_index` for filtering and citation purposes.
