# 🏗️ Technical Implementation Confirmation

**Status**: ✅ Verified by Tech Lead
**Date**: April 2026

This document serves as a formal confirmation of the background task and real-time messaging architecture implemented in the AI Document Q&A System.

---

## 🐎 Celery: Background Task Queue

The system uses **Celery** with **Redis** to handle high-latency operations, ensuring the user interface remains fluid during heavy AI processing.

### 📍 Verified Implementation Points
- **Configuration**: Located in `backend/config/celery.py`. It uses `CELERY` namespace for Django settings.
- **Task Discovery**: Automatically discovers tasks in all registered Django apps.
- **Critical Tasks**:
    - `generate_embeddings_task`: (in `embeddings/tasks.py`) Handles the computationally expensive process of chunking documents and generating vectors via HuggingFace/Gemini.
    - `rebuild_embeddings_task`: (in `embeddings/tasks.py`) Manages the state and cleanup when a document needs to be re-indexed.

### 🛠️ Verification Command
To verify the Celery worker is correctly picking up tasks:
```bash
celery -A config worker -l info
```

---

## 🌐 WebSockets: Real-time Communication

Real-time interactions are powered by **Django Channels**, transitioning from standard HTTP to a persistent bidirectional stream for AI responses.

### 📍 Verified Implementation Points
- **Protocol Router**: Located in `backend/config/asgi.py`. Correctly routes `websocket` traffic through the `AuthMiddlewareStack`.
- **Consumer Logic**: Located in `backend/conversations/consumers.py`. 
    - Implements `AsyncWebsocketConsumer`.
    - Supports `chat_message` (complete responses) and `chat_stream` (token-by-token streaming).
    - Includes **Typing Indicators** and **Connection Health Checks (Ping/Pong)**.
- **Routing**: URI patterns are defined in `backend/conversations/routing.py`, mapping URLs like `ws/chat/<conversation_id>/` to the `ChatConsumer`.

### 🛠️ Verification Command
The WebSocket server (Daphne/Uvicorn) can be tested by attempting a connection to the WS endpoint using a tool like `wscat`:
```bash
wscat -c ws://localhost:8000/ws/chat/<cid>/
```

---

## 🔒 Security & Performance
- **Authentication**: WebSocket connections require a valid JWT or Session cookie, verified in the middleware stack.
- **Concurrency**: Daphne/Uvicorn handles hundreds of concurrent WebSocket connections using Python's `asyncio`.
- **Reliability**: Celery tasks include retry logic with exponential backoff for external API calls (Gemini/Cloudinary).

---

> [!IMPORTANT]
> Both systems require a running **Redis** instance (`redis-server`) to function as the message broker and channel layer.
