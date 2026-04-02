"""
Health check endpoints.
"""
from django.urls import path
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
import time


def health_check(request):
    """Basic health check endpoint — always returns 200 if server is Up."""
    return JsonResponse({'status': 'ok'})


def ready_check(request):
    """Readiness check - verifies database and cache connections."""
    health = {
        'status': 'healthy',
        'checks': {}
    }

    # Database check
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        health['checks']['database'] = 'ok'
    except Exception as e:
        health['checks']['database'] = f'error: {str(e)}'
        health['status'] = 'unhealthy'

    # Cache check
    try:
        cache.set('health_check', 'ok', 10)
        if cache.get('health_check') == 'ok':
            health['checks']['cache'] = 'ok'
        else:
            health['checks']['cache'] = 'error: cache not responding'
            health['status'] = 'unhealthy'
    except Exception as e:
        health['checks']['cache'] = f'error: {str(e)}'
        health['status'] = 'unhealthy'

    status_code = 200 if health['status'] == 'healthy' else 503
    return JsonResponse(health, status=status_code)


urlpatterns = [
    path('', health_check, name='health-check'),
    path('ready/', ready_check, name='ready-check'),
]
