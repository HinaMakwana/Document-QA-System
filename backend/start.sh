#!/bin/bash
set -e

echo "=== Starting Backend Boot Sequence ==="

# Wait for database if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
    echo "Checking database connection..."
    # A simple way to wait for Postgres without installing extra tools
    MAX_RETRIES=30
    COUNT=0
    until python -c "import dj_database_url, psycopg2; psycopg2.connect(dj_database_url.config()['NAME'])" > /dev/null 2>&1 || [ $COUNT -eq $MAX_RETRIES ]; do
        echo "Waiting for database to be ready... ($COUNT/$MAX_RETRIES)"
        sleep 2
        COUNT=$((COUNT+1))
    done
fi

echo "=== Running database migrations ==="
# Hard failure if migrations fail so we can see the exact error in the logs
python manage.py migrate --noinput

echo "=== Collecting static files ==="
python manage.py collectstatic --noinput --clear 2>/dev/null || true

echo "=== Starting Server on Port ${PORT:-8000} ==="
# Use gunicorn with a generous timeout and ensure it binds to all interfaces
exec gunicorn config.asgi:application \
    -k uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers ${GUNICORN_WORKERS:-2} \
    --timeout 300 \
    --access-logfile - \
    --error-logfile -
