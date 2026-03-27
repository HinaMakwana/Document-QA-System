FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies needed for:
# - libmagic1: python-magic file type detection
# - libpq-dev + gcc: psycopg2 PostgreSQL adapter
# - dos2unix: fix Windows line endings in scripts
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    libpq-dev \
    gcc \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .

# Install CPU-only PyTorch FIRST (saves ~1.5GB vs full CUDA torch)
# sentence-transformers needs torch but we don't need GPU on Render
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Now install all other requirements
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Fix Windows line endings in shell scripts (critical for Linux containers)
RUN dos2unix /app/start.sh 2>/dev/null || sed -i 's/\r$//' /app/start.sh

# Create necessary directories
RUN mkdir -p /app/logs /app/staticfiles /app/media /app/chroma_db

# Collect static files (may fail if DB not ready, that's ok)
RUN python manage.py collectstatic --noinput 2>/dev/null || true

# Make start script executable
RUN chmod +x /app/start.sh

EXPOSE 8000

# Use the start script as entrypoint
CMD ["/app/start.sh"]
