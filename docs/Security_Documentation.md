# Security Documentation

This document describes the security measures, threat model, and compliance notes for the AI Document Q&A System.

## Security Measures

### 1. Authentication and Authorization
- **JWT (JSON Web Token)**: The system uses `rest_framework_simplejwt` for secure user authentication. Access tokens have short lifetimes (1 hour), while refresh tokens (7 days) are used to renew sessions.
- **Refresh Token Rotation**: Enhanced security through `ROTATE_REFRESH_TOKENS: True`, which issues a new refresh token and blacklists the old one on each renewal.
- **API Key Authentication**: For programmatic access, users can generate unique `X-API-Key` headers under **Settings → API Access Keys**. This enables external integrations without compromising user passwords.
- **Custom User Model**: A custom `User` model (`accounts.User`) extends Django's base user for more granular management.
- **Permissions**: `IsAuthenticated` is the default policy for all sensitive endpoints, ensuring only authorized users can access documents and conversations.

---

### 2. API Key Management
- **LLM Keys**: LLM (Gemini) API keys are stored as environment variables (`GEMINI_API_KEY`) and never exposed to the frontend.
- **Media Storage Keys**: Cloudinary keys for document uploads are strictly managed in `.env` and `settings.py`.
- **System API Keys**: User-generated API keys are stored using hashed formats where appropriate to prevent leakage from the database.

---

### 3. Input Validation and Sanitization
- **Strict Validation**: The `InputValidator` class checks all user-submitted messages for:
    - **Empty Content**: Prevents processing of blank requests.
    - **Maximum Length**: Messages are capped at 10,000 characters to prevent overflow or DOS attacks.
    - **Pattern Matching**: Checks for sensitive patterns and malicious inputs.
- **Document Validation**: Uploads are restricted to specific file types (`PDF`, `DOCX`, `DOC`, `TXT`) and size-limited to 10MB to avoid server-side memory exhaustion.

---

### 4. Rate Limiting Strategy
- **Middleware-based Limiting**: `RateLimitMiddleware` enforces usage constraints based on user tiers.
- **Tiered Limits**:
    - **Default Limit**: 100 requests per hour for standard users.
    - **Premium Limit**: 1,000 requests per hour for high-usage accounts.
- **Daily Caps**: Each user is restricted to a maximum of 100,000 tokens per day to protect system resources and API costs.

---

### 5. Prompt Injection Prevention
The system implements multiple layers to prevent "Jailbreaking" or instruction overrides:
- **Blocked Patterns**: The `InputValidator` maintains a list of blocked phrases like "ignore previous instructions," "forget your instructions," or "system prompt:".
- **System Prompt Separation**: User input is explicitly separated from the `SYSTEM_PROMPT` in the LLM execution layer, ensuring instructions are treated as data, not control logic.
- **Safety Filters**: Gemini's built-in safety settings (`HARM_CATEGORY_*`) are configured to block harassment, hate speech, and dangerous content.

---

## Threat Model

| Threat | Description | Mitigation Strategy |
| :--- | :--- | :--- |
| **Prompt Injection** | User attempts to hijack AI instructions to bypass security. | `InputValidator` (Blocked Patterns) + Separated System Prompts. |
| **Brute Force** | Automated attempts to guess passwords or API keys. | Django's built-in protection + `RateLimitMiddleware`. |
| **Data Leakage** | Unauthorized access to user documents. | `IsAuthenticated` permission + Document ownership checks in models. |
| **Malicious File Upload** | Uploading scripts or oversized files for DOS. | `ALLOWED_FILE_TYPES` validation + `MAX_UPLOAD_SIZE_MB` limit. |
| **Token Exhaustion** | Flooding the API to incur massive costs. | `MAX_TOKENS_PER_DAY` limit + per-user token tracking. |

---

## Compliance Notes

### 1. GDPR (General Data Protection Regulation)
- **Data Minimization**: We only collect necessary information (email, password) for service operation.
- **Right to Erasure**: Users can delete their accounts, which removes all associated documents, conversations, and personal data from both the database and Cloudinary.
- **Audit Trails**: `UsageLog` and `DailyUsageSummary` track activity, ensuring transparent documentation of data processing.

### 2. Data Privacy
- **Local Embeddings**: Generating embeddings on local servers (using `sentence-transformers`) ensures that sensitive document content stays within our controlled environment.
- **Secure Storage**: Files are stored in Cloudinary with restricted access, and vector snippets in ChromaDB are linked only to user-specific document IDs.
- **Transparency**: Clear metadata tracking allows users to see exactly which documents and snippets were processed in any conversation.
