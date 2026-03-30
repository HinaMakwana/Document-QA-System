# Architecture Documentation

This document provides a high-level overview of the AI Document Q&A System's architecture, data flows, and technology stack.

## System Architecture Diagram

The system follows a modern decoupled architecture with a Django backend and React frontend.

[View System Architecture Diagram](https://www.awesomescreenshot.com/image/59512081?key=1037e580e271c67efa329e674c055692)


### High-level Components:
- **Django Application**: Core API for users, conversations, and document management.
- **LangChain Integration**: Custom service layer wrapping LLM and RAG logic.
- **Database**: Stores relational data (users, messages, document metadata).
- **Vector Database**: ChromaDB for semantic search.
- **Celery & Redis**: Handles long-running tasks for document ingestion and embedding generation.
- **External APIs**: Gemini for text generation and Cloudinary for document storage.

---

## Data Flow Diagrams

### 1. Document Processing Pipeline
When a user uploads a document:
1.  **Upload**: Frontend sends file to Backend.
2.  **Storage**: Backend uploads file to Cloudinary and saves metadata to Database.
3.  **Task Trigger**: Backend triggers `process_document_task` in Celery.
4.  **Extraction**: Celery worker extracts text (PDF/Docx/Txt).
5.  **Chunking**: Text is split into semantic chunks.
6.  **Embedding**: Second task `generate_embeddings_task` creates vectors.
7.  **Indexing**: Vectors and metadata are stored in ChromaDB.
8.  **Completion**: Document status is updated to `COMPLETED`.

### 2. RAG Query Flow
When a user asks a question in a conversation:
1.  **Request**: Frontend sends query to `/api/conversations/<id>/message/`.
2.  **Context Retrieval**: `RAGService` searches ChromaDB for relevant document chunks.
3.  **LLM Prompting**: `LLMService` builds a contextual prompt (System Prompt + History + Context + User Message).
4.  **Generation**: Gemini API generates a response with citations.
5.  **Logging**: Usage logs (tokens, response time) are saved for analytics.
6.  **Response**: Formatted response with citations is returned to the user.

### 3. Conversation Flow
- **Authentication**: JWT-based security for all API interactions.

---

## Component Diagrams

### Backend Components:
- **`accounts`**: User management, authentication, and API keys.
- **`documents`**: File processing, chunking, and metadata storage.
- **`embeddings`**: RAG and vector store operations.
- **`conversations`**: Chat flow, prompt templates, and AI logic.
- **`analytics`**: Token tracking, performance metrics, and usage logging.

### Frontend Components:
- **Chat Interface**: Interactive UI for messaging and document display.
- **Document Manager**: Interface for uploading and tracking processing status.
- **Dashboard**: Visual representations of token usage and costs.
- **Settings**: Management for profile, security, and API access.

---

## Technology Stack

| Layer | Technology | Version |
| :--- | :--- | :--- |
| **Backend Framework** | Django / DRF | 5.1+ |
| **Frontend Framework** | React / Vite | 19.1+ |
| **Styling** | Tailwind CSS / Framer Motion | 4.1+ |
| **Primary Database** | SQLite (dev) / PostgreSQL (prod) | - |
| **Vector Database** | ChromaDB | 0.5+ |
| **Task Queue** | Celery / Redis | 5.4+ / 5.0+ |
| **LLM** | Google Gemini | `2.0-flash` / `flash-latest` |
| **Embeddings** | Sentence Transformers | `all-MiniLM-L6-v2` |
| **Media Storage** | Cloudinary | - |
| **Authentication** | SimpleJWT / API Key | - |
| **Documentation** | Swagger / drf-yasg | - |
| **Visual Library** | Recharts (React) | 3.7+ |
