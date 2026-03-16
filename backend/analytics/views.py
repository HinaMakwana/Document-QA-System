"""
Views for the analytics app.
"""
from datetime import timedelta
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from .services import AnalyticsService, CostTracker
from .models import UsageLog, DailyUsageSummary


class IsAdminUser(permissions.BasePermission):
    """Allow access only to admin users."""

    def has_permission(self, request, view):
        return request.user and request.user.is_staff


class UserUsageStatsView(APIView):
    """
    Get detailed usage statistics for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        days = min(days, 365)  # Cap at 1 year

        service = AnalyticsService()
        stats = service.get_user_usage_stats(request.user, days)

        return Response({
            'success': True,
            'data': stats
        })


class UserCostEstimateView(APIView):
    """
    Get cost estimates for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tracker = CostTracker()
        estimate = tracker.estimate_monthly_cost(request.user)

        return Response({
            'success': True,
            'data': estimate
        })


class UsageHistoryView(APIView):
    """
    Get paginated usage history for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        page = int(request.query_params.get('page', 1))
        page_size = min(int(request.query_params.get('page_size', 50)), 100)
        event_type = request.query_params.get('event_type')

        offset = (page - 1) * page_size

        queryset = UsageLog.objects.filter(user=request.user)

        if event_type:
            queryset = queryset.filter(event_type=event_type)

        total = queryset.count()
        logs = queryset[offset:offset + page_size]

        return Response({
            'success': True,
            'data': {
                'total': total,
                'page': page,
                'page_size': page_size,
                'results': [
                    {
                        'id': str(log.id),
                        'event_type': log.event_type,
                        'tokens_used': log.tokens_used,
                        'processing_time_ms': log.processing_time_ms,
                        'endpoint': log.endpoint,
                        'created_at': log.created_at.isoformat(),
                    }
                    for log in logs
                ]
            }
        })


class DailySummaryView(APIView):
    """
    Get daily usage summaries for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        days = int(request.query_params.get('days', 30))
        days = min(days, 365)

        start_date = timezone.now().date() - timedelta(days=days)

        summaries = DailyUsageSummary.objects.filter(
            user=request.user,
            date__gte=start_date
        ).order_by('-date')

        return Response({
            'success': True,
            'data': [
                {
                    'date': summary.date.isoformat(),
                    'chat_count': summary.chat_count,
                    'search_count': summary.search_count,
                    'upload_count': summary.upload_count,
                    'total_tokens': summary.total_tokens,
                    'avg_response_time_ms': summary.avg_response_time_ms,
                    'estimated_cost': float(summary.estimated_cost),
                }
                for summary in summaries
            ]
        })


class AdminDashboardView(APIView):
    """
    Get system-wide statistics for admin dashboard.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        service = AnalyticsService()
        stats = service.get_admin_dashboard_stats()

        return Response({
            'success': True,
            'data': stats
        })


class AdminUserUsageView(APIView):
    """
    Get usage statistics for a specific user (admin only).
    """
    permission_classes = [IsAdminUser]

    def get(self, request, user_id):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                'success': False,
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)

        days = int(request.query_params.get('days', 30))

        service = AnalyticsService()
        stats = service.get_user_usage_stats(user, days)

        # Add user info
        stats['user'] = {
            'id': str(user.id),
            'email': user.email,
            'tier': user.tier,
            'created_at': user.created_at.isoformat(),
        }

        return Response({
            'success': True,
            'data': stats
        })


class ExportUsageView(APIView):
    """
    Export usage data as CSV (admin only).
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        import csv
        from django.http import HttpResponse

        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)

        logs = UsageLog.objects.filter(
            created_at__gte=start_date
        ).select_related('user').order_by('-created_at')

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="usage_export_{timezone.now().date()}.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'ID', 'User Email', 'Event Type', 'Tokens Used',
            'Processing Time (ms)', 'Endpoint', 'Created At'
        ])

        for log in logs:
            writer.writerow([
                str(log.id),
                log.user.email,
                log.event_type,
                log.tokens_used,
                log.processing_time_ms,
                log.endpoint,
                log.created_at.isoformat(),
            ])

        return response
