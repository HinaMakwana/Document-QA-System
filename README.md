# 🤖 AI Document Q&A System

![Status: Functional](https://img.shields.io/badge/Status-Functional-success)
![Coverage: 48%](https://img.shields.io/badge/Coverage-48%25-orange)
![License: MIT](https://img.shields.io/badge/License-MIT-blue)

A state-of-the-art intelligent document Q&A system that leverages **Retrieval-Augmented Generation (RAG)** to provide precise answers from your private documents.

---

## 📑 Project Navigation

| Component | Description | Links |
| :--- | :--- | :--- |
| **Backend** | Django & Celery RAG Engine | [README](backend/README.md) |
| **Frontend** | Modern React Dashboard | [README](frontend/README.md) |
| **Documentation** | Architecture & Setup | [Docs Folder](docs/) |
| **System Status** | Celery & WebSockets | [Implementation Detail](docs/SYSTEM_IMPLEMENTATION.md) |
| **Demo Guide** | How to record a demo | [Recording Guide](docs/DEMO_GUIDE.md) |
| **Test Coverage** | Backend coverage metrics | [Coverage Report](docs/TEST_COVERAGE.md) |

---

## ⚡ System Core Status

### 🐎 Celery (Background Tasks)
- **Status**: ✅ **Implemented**
- **Purpose**: Asynchronous document processing and embedding generation.
- **Key Files**: `backend/config/celery.py`, `backend/embeddings/tasks.py`
- **Confirmation**: High-latency AI operations (like embedding thousands of tokens) are offloaded to workers to ensure a responsive UI.

### 🌐 WebSockets (Real-time Communication)
- **Status**: ✅ **Implemented**
- **Purpose**: Real-time chat streaming and typing indicators.
- **Key Files**: `backend/config/asgi.py`, `backend/conversations/consumers.py`
- **Confirmation**: Uses Django Channels with Redis as a layer to provide sub-second latency for AI-generated responses.

---

## 🎥 Project Demo

> [!TIP]
> **Watch the full project walkthrough below to see RAG in action!**

*(Placeholder for Demo Video)*
[![Demo Video](https://www.awesomescreenshot.com/video/51084763?key=57a064c255473c4670d15ae2c7277aaf)](https://www.awesomescreenshot.com/video/51084763?key=57a064c255473c4670d15ae2c7277aaf)


---

## 📊 Test Coverage

The project currently maintains a **48% test coverage** on the backend core.

- **Accounts**: 100%
- **Documents**: 35%
- **Conversations**: 52%
- **Embeddings**: 100% (Model-independent tests)

For a detailed breakdown and instructions on how to run tests, see the [Full Coverage Report](docs/TEST_COVERAGE.md).

---

## 🚀 Getting Started

1. **Clone the repository**
2. **Setup Backend**: Follow [Backend Setup](backend/README.md#quick-start)
3. **Setup Frontend**: Follow [Frontend Setup](frontend/README.md#getting-started)
4. **Run Services**: Start Redis, Celery Worker, and Django/Vite servers.

---

© 2026 AI Document Q&A System. Built with 💎 and AI.
