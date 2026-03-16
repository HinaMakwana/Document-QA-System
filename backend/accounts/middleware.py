"""
Rate limiting middleware.
"""
import time
from django.conf import settings
from django.http import JsonResponse
from django.core.cache import cache


class RateLimitMiddleware:
    """
    Rate limiting middleware that enforces per-user request limits.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        # Parse rate limit from settings (e.g., "100/hour")
        self.default_limit = self._parse_rate_limit(
            getattr(settings, 'DEFAULT_RATE_LIMIT', '100/hour')
        )
        self.premium_limit = self._parse_rate_limit(
            getattr(settings, 'PREMIUM_RATE_LIMIT', '1000/hour')
        )

    def _parse_rate_limit(self, rate_string):
        """Parse rate limit string (e.g., '100/hour') into (count, seconds)."""
        try:
            count, period = rate_string.split('/')
            count = int(count)

            period_seconds = {
                'second': 1,
                'minute': 60,
                'hour': 3600,
                'day': 86400,
            }
            seconds = period_seconds.get(period, 3600)

            return (count, seconds)
        except (ValueError, AttributeError):
            return (100, 3600)  # Default: 100/hour

    def _get_client_ip(self, request):
        """Get client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'unknown')

    def _get_rate_limit(self, user):
        """Get rate limit based on user tier."""
        if user and user.is_authenticated:
            tier = getattr(user, 'tier', 'free')
            if tier in ['premium', 'enterprise']:
                return self.premium_limit
            elif tier == 'basic':
                # Basic users get 5x the default limit
                count, seconds = self.default_limit
                return (count * 5, seconds)
        return self.default_limit

    def _check_rate_limit(self, request):
        """Check if request should be rate limited."""
        # Skip rate limiting for admin and auth endpoints
        if request.path.startswith('/admin/') or request.path.startswith('/api/v1/auth/'):
            return True, None

        # Get identifier (user ID or IP)
        if hasattr(request, 'user') and request.user.is_authenticated:
            identifier = f"user:{request.user.id}"
            rate_limit = self._get_rate_limit(request.user)
        else:
            identifier = f"ip:{self._get_client_ip(request)}"
            rate_limit = self.default_limit

        max_requests, window_seconds = rate_limit
        cache_key = f"rate_limit:{identifier}"

        # Get current request count
        current_data = cache.get(cache_key, {'count': 0, 'reset_time': time.time() + window_seconds})

        # Check if window has expired
        if time.time() > current_data.get('reset_time', 0):
            current_data = {'count': 0, 'reset_time': time.time() + window_seconds}

        # Check limit
        if current_data['count'] >= max_requests:
            reset_in = int(current_data['reset_time'] - time.time())
            return False, {
                'limit': max_requests,
                'remaining': 0,
                'reset_in': reset_in,
            }

        # Increment counter
        current_data['count'] += 1
        cache.set(cache_key, current_data, timeout=window_seconds)

        return True, {
            'limit': max_requests,
            'remaining': max_requests - current_data['count'],
            'reset_in': int(current_data['reset_time'] - time.time()),
        }

    def __call__(self, request):
        allowed, rate_info = self._check_rate_limit(request)

        if not allowed:
            return JsonResponse({
                'success': False,
                'error': {
                    'code': 429,
                    'message': 'Rate limit exceeded',
                    'details': {
                        'limit': rate_info['limit'],
                        'reset_in_seconds': rate_info['reset_in'],
                    }
                }
            }, status=429)

        response = self.get_response(request)

        # Add rate limit headers
        if rate_info:
            response['X-RateLimit-Limit'] = rate_info['limit']
            response['X-RateLimit-Remaining'] = rate_info['remaining']
            response['X-RateLimit-Reset'] = rate_info['reset_in']

        return response
