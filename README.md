# AI Document Q&A System

An intelligent document Q&A system that allows users to upload documents and ask questions in natural language using RAG (Retrieval-Augmented Generation).

## Features

- **Document Upload**: Support for PDF, DOCX, and TXT files
- **Semantic Search**: Find relevant information using AI embeddings
- **Natural Language Q&A**: Ask questions about your documents
- **Citations**: See which document sections were used for answers
- **Conversation History**: Track and manage conversation threads
- **Usage Analytics**: Monitor token usage and API calls

## Tech Stack

- **Backend**: Django 4.2+, Django REST Framework
- **Database**: PostgreSQL
- **Vector Store**: ChromaDB (open source)
- **Embeddings**: HuggingFace sentence-transformers (free)
- **LLM**: Google Gemini (free tier)
- **Task Queue**: Celery with Redis
- **WebSockets**: Django Channels

## Quick Start

### 1. Clone and Setup

```bash
cd ai-doc
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 3. Database Setup

```bash
# For development, you can use SQLite by updating settings.py
# Or install PostgreSQL and create database:
createdb ai_doc_qa

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

### 4. Install Required Dependencies

```bash
# Core dependencies
pip install django djangorestframework django-cors-headers
pip install djangorestframework-simplejwt drf-yasg
pip install python-decouple psycopg2-binary

# AI/ML dependencies
pip install google-generativeai sentence-transformers chromadb

# Document processing
pip install pypdf python-docx

# Async tasks
pip install celery redis django-celery-beat django-celery-results

# WebSocket support
pip install channels channels-redis daphne
```

### 5. Start Services

```bash
# Start Redis (required for Celery and WebSockets)
redis-server

# Start Celery worker (in a new terminal)
celery -A config worker -l info

# Start Django development server
python manage.py runserver
```

### 6. Access the Application

- **Web Interface**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin
- **API Documentation**: http://localhost:8000/swagger
- **Health Check**: http://localhost:8000/api/v1/health

## API Endpoints

### Authentication
- `POST /api/v1/auth/register/` - Register new user
- `POST /api/v1/auth/login/` - Login
- `POST /api/v1/auth/logout/` - Logout
- `GET /api/v1/auth/profile/` - Get user profile
- `GET /api/v1/auth/usage/` - Get usage statistics

### Documents
- `GET /api/v1/documents/` - List documents
- `POST /api/v1/documents/` - Upload document
- `GET /api/v1/documents/{id}/` - Get document details
- `DELETE /api/v1/documents/{id}/` - Delete document

### Conversations
- `GET /api/v1/conversations/` - List conversations
- `POST /api/v1/conversations/` - Create conversation
- `POST /api/v1/conversations/{id}/chat/` - Send message
- `POST /api/v1/conversations/quick/` - Quick question

### Search
- `POST /api/v1/embeddings/search/` - Semantic search

### Analytics
- `GET /api/v1/analytics/usage/` - Usage statistics
- `GET /api/v1/analytics/admin/dashboard/` - Admin dashboard

## Project Structure

```
ai-doc/
├── config/              # Django project settings
├── accounts/            # User authentication & profiles
├── documents/           # Document upload & processing
├── conversations/       # Chat & AI responses
├── embeddings/          # Vector store & RAG
├── analytics/           # Usage tracking
├── templates/           # HTML templates
├── static/              # CSS, JS, images
├── media/               # Uploaded files
└── requirements.txt
```

## Configuration

### Gemini API Setup

1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Add to `.env`: `GEMINI_API_KEY=your-key-here`

### PostgreSQL Setup (Optional)

For production, use PostgreSQL:

```bash
# Install PostgreSQL
brew install postgresql  # macOS
sudo apt install postgresql  # Ubuntu

# Create database
createdb ai_doc_qa

# Update .env with database credentials
```

## Development

### Running Tests

```bash
pytest --cov=. --cov-report=html
```

### Code Formatting

```bash
black .
isort .
flake8 .
```

## License

MIT License
