# System Flow & Architecture

This document provides a visual and step-by-step walkthrough of the two most critical processes in the system: **Document Ingestion** and **AI-Powered Question Answering (RAG)**.

---

## 1. Document Upload & Processing Flow
This diagram shows what happens when a user selects a file and uploads it. The process is asynchronous to ensure the frontend remains responsive even for large documents.

[View Document Upload & Processing Flow Diagram](https://www.awesomescreenshot.com/image/59512275?key=6601550868d593f9bb856a4af9d54717)

### Key Stages:
- **Instant Response**: The user gets a "Success" message immediately after the file is uploaded to Cloudinary, while the heavy lifting happens in the background.
- **Text Chunking**: Large documents are broken down into smaller segments to ensure the AI can find exactly the right section later.
- **Cold Storage vs. Hot Search**: The raw text is saved in the relational database (PostgreSQL/SQLite), while the "semantic meaning" (vectors) is stored in ChromaDB for fast searching.

---

## 2. RAG (Question & Answer) Flow
This diagram explains how the system "searches" your documents and uses the AI to generate an answer based *only* on your data.

[View RAG (Question & Answer) Flow Diagram](https://www.awesomescreenshot.com/image/59512294?key=4afd92fd3572e085b62b918e6be35586)

### Why this works:
- **Semantic Search**: The system doesn't just look for exact word matches; it understands the *intent* of your question.
- **Context Injection**: We "feed" the AI the exact parts of your document that contain the answer, preventing "hallucinations" (the AI making things up).
- **Citations**: For every answer, the system tracks exactly which document and page it came from, providing 100% transparency.

---

## 3. High-Level Logic "Brain"
A simplified summary of the system architecture for non-technical stakeholders.

[View High-Level Logic "Brain" Diagram](https://www.awesomescreenshot.com/image/59512304?key=bd0e682557956b551799256c4d766330)

1.  **Ingestion**: Files go in, get broken down, and turned into numbers (vectors).
2.  **Retrieval**: Questions get turned into numbers and matched against the knowledge base.
3.  **Synthesis**: The AI reads the matching facts and writes a human-friendly answer.
