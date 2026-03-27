FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies needed for:
# - libmagic1: python-magic file type detection
# - libpq-dev + gcc: psycopg2 PostgreSQL adapter
# - libgl1-mesa-glx + libglib2.0-0: document processing libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs /app/staticfiles /app/media /app/chroma_db

# Collect static files (may fail if DB not ready, that's ok)
RUN python manage.py collectstatic --noinput 2>/dev/null || true

# Make start script executable
RUN chmod +x /app/start.sh

EXPOSE 8000

# Use the start script as entrypoint
CMD ["/app/start.sh"]
