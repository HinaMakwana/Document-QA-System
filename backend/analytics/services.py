"""
Services for analytics and reporting.
"""
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, List

from django.conf import settings
from django.db.models import Sum, Avg, Count
from django.db.models.functions import TruncDate
from django.utils import timezone

logger = logging.getLogger('ai_doc')


class AnalyticsService:
    """Service for generating analytics and reports."""

    # Cost estimation per 1M tokens (Gemini free tier is free, but we track for reference)
    COST_PER_MILLION_INPUT_TOKENS = Decimal('0.00')  # Free tier
    COST_PER_MILLION_OUTPUT_TOKENS = Decimal('0.00')  # Free tier

    def log_usage(
        self,
        user,
        event_type: str,
        tokens_used: int = 0,
        processing_time_ms: int = 0,
        metadata: Dict = None,
        endpoint: str = '',
        ip_address: str = None,
    ):
        """Log an API usage event."""
        from .models import UsageLog

        estimated_cost = self._estimate_cost(tokens_used)

        UsageLog.objects.create(
            user=user,
            event_type=event_type,
            tokens_used=tokens_used,
            processing_time_ms=processing_time_ms,
            estimated_cost=estimated_cost,
            metadata=metadata or {},
            endpoint=endpoint,
            ip_address=ip_address,
        )

    def _estimate_cost(self, tokens: int) -> Decimal:
        """Estimate cost based on token usage."""
        # For Gemini free tier, cost is 0
        # This is for tracking purposes if you switch to a paid plan
        return Decimal('0.00')

    def get_user_usage_stats(
        self,
        user,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get usage statistics for a user."""
        from .models import UsageLog

        start_date = timezone.now() - timedelta(days=days)

        logs = UsageLog.objects.filter(
            user=user,
            created_at__gte=start_date
        )

        # Aggregate statistics
        stats = logs.aggregate(
            total_tokens=Sum('tokens_used'),
            total_events=Count('id'),
            avg_response_time=Avg('processing_time_ms'),
            total_cost=Sum('estimated_cost'),
        )

        # Event type breakdown
        event_breakdown = logs.values('event_type').annotate(
            count=Count('id'),
            tokens=Sum('tokens_used')
        )

        # Daily usage trend
        daily_trend = logs.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            tokens=Sum('tokens_used'),
            events=Count('id')
        ).order_by('date')

        return {
            'period_days': days,
            'totals': {
                'tokens': stats['total_tokens'] or 0,
                'events': stats['total_events'] or 0,
                'avg_response_time_ms': int(stats['avg_response_time'] or 0),
                'estimated_cost': float(stats['total_cost'] or 0),
            },
            'by_event_type': list(event_breakdown),
            'daily_trend': list(daily_trend),
        }

    def get_admin_dashboard_stats(self) -> Dict[str, Any]:
        """Get system-wide statistics for admin dashboard."""
        from django.contrib.auth import get_user_model
        from documents.models import Document, DocumentChunk
        from conversations.models import Conversation, Message
        from .models import UsageLog

        User = get_user_model()

        today = timezone.now().date()
        last_30_days = today - timedelta(days=30)
        last_7_days = today - timedelta(days=7)

        # User stats
        total_users = User.objects.count()
        new_users_30d = User.objects.filter(created_at__date__gte=last_30_days).count()
        active_users_7d = User.objects.filter(
            usage_logs__created_at__date__gte=last_7_days
        ).distinct().count()

        # Document stats
        total_documents = Document.objects.count()
        documents_30d = Document.objects.filter(created_at__date__gte=last_30_days).count()
        completed_documents = Document.objects.filter(status='completed').count()
        total_chunks = DocumentChunk.objects.count()

        # Conversation stats
        total_conversations = Conversation.objects.count()
        total_messages = Message.objects.count()
        conversations_30d = Conversation.objects.filter(created_at__date__gte=last_30_days).count()

        # Usage stats
        usage_30d = UsageLog.objects.filter(created_at__date__gte=last_30_days).aggregate(
            total_tokens=Sum('tokens_used'),
            total_events=Count('id'),
            avg_response_time=Avg('processing_time_ms'),
        )

        # Top users by usage
        top_users = User.objects.annotate(
            total_tokens=Sum('usage_logs__tokens_used')
        ).filter(total_tokens__isnull=False).order_by('-total_tokens')[:10]

        return {
            'users': {
                'total': total_users,
                'new_30d': new_users_30d,
                'active_7d': active_users_7d,
            },
            'documents': {
                'total': total_documents,
                'new_30d': documents_30d,
                'completed': completed_documents,
                'total_chunks': total_chunks,
            },
            'conversations': {
                'total': total_conversations,
                'new_30d': conversations_30d,
                'total_messages': total_messages,
            },
            'usage_30d': {
                'total_tokens': usage_30d['total_tokens'] or 0,
                'total_events': usage_30d['total_events'] or 0,
                'avg_response_time_ms': int(usage_30d['avg_response_time'] or 0),
            },
            'top_users': [
                {'email': u.email, 'tokens_used': u.total_tokens}
                for u in top_users
            ],
        }

    def generate_daily_summary(self, user, date: datetime.date = None):
        """Generate or update daily usage summary for a user."""
        from .models import UsageLog, DailyUsageSummary

        if date is None:
            date = timezone.now().date()

        logs = UsageLog.objects.filter(
            user=user,
            created_at__date=date
        )

        stats = logs.aggregate(
            total_tokens=Sum('tokens_used'),
            avg_response=Avg('processing_time_ms'),
            total_cost=Sum('estimated_cost'),
        )

        chat_count = logs.filter(event_type='chat').count()
        search_count = logs.filter(event_type='search').count()
        upload_count = logs.filter(event_type='upload').count()

        summary, created = DailyUsageSummary.objects.update_or_create(
            user=user,
            date=date,
            defaults={
                'chat_count': chat_count,
                'search_count': search_count,
                'upload_count': upload_count,
                'total_tokens': stats['total_tokens'] or 0,
                'avg_response_time_ms': int(stats['avg_response'] or 0),
                'estimated_cost': stats['total_cost'] or Decimal('0'),
            }
        )

        return summary


class CostTracker:
    """Track and estimate costs for the system."""

    @staticmethod
    def estimate_monthly_cost(user) -> Dict[str, Any]:
        """Estimate monthly cost for a user based on usage patterns."""
        from .models import DailyUsageSummary

        last_30_days = timezone.now().date() - timedelta(days=30)

        summaries = DailyUsageSummary.objects.filter(
            user=user,
            date__gte=last_30_days
        )

        totals = summaries.aggregate(
            total_tokens=Sum('total_tokens'),
            total_cost=Sum('estimated_cost'),
            total_chats=Sum('chat_count'),
            total_searches=Sum('search_count'),
        )

        # Project monthly usage
        days_with_data = summaries.count()
        if days_with_data > 0:
            avg_daily_tokens = (totals['total_tokens'] or 0) / days_with_data
            projected_monthly_tokens = avg_daily_tokens * 30
        else:
            projected_monthly_tokens = 0

        return {
            'actual_30d': {
                'tokens': totals['total_tokens'] or 0,
                'cost': float(totals['total_cost'] or 0),
                'chats': totals['total_chats'] or 0,
                'searches': totals['total_searches'] or 0,
            },
            'projected_monthly': {
                'tokens': int(projected_monthly_tokens),
                'cost': 0.0,  # Free tier
            },
            'tier': user.tier,
            'limits': user.get_tier_limits(),
        }
