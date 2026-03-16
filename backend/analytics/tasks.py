"""
Celery tasks for analytics.
"""
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger('ai_doc')


@shared_task
def generate_daily_summaries():
    """Generate daily usage summaries for all users with activity."""
    from django.contrib.auth import get_user_model
    from .models import UsageLog
    from .services import AnalyticsService

    User = get_user_model()
    yesterday = timezone.now().date() - timedelta(days=1)

    # Get users with activity yesterday
    user_ids = UsageLog.objects.filter(
        created_at__date=yesterday
    ).values_list('user_id', flat=True).distinct()

    service = AnalyticsService()
    count = 0

    for user_id in user_ids:
        try:
            user = User.objects.get(id=user_id)
            service.generate_daily_summary(user, yesterday)
            count += 1
        except Exception as e:
            logger.error(f"Error generating summary for user {user_id}: {str(e)}")

    logger.info(f"Generated {count} daily summaries for {yesterday}")
    return {'date': str(yesterday), 'summaries_generated': count}


@shared_task
def generate_system_metrics():
    """Generate system-wide metrics for the previous day."""
    from django.contrib.auth import get_user_model
    from documents.models import Document, DocumentChunk
    from conversations.models import Conversation, Message
    from .models import UsageLog, SystemMetrics
    from django.db.models import Sum, Avg

    User = get_user_model()
    yesterday = timezone.now().date() - timedelta(days=1)

    # User metrics
    total_users = User.objects.count()
    active_users = UsageLog.objects.filter(
        created_at__date=yesterday
    ).values('user').distinct().count()
    new_users = User.objects.filter(created_at__date=yesterday).count()

    # Document metrics
    total_documents = Document.objects.count()
    documents_processed = Document.objects.filter(
        processing_completed_at__date=yesterday
    ).count()
    total_chunks = DocumentChunk.objects.count()

    # Conversation metrics
    total_conversations = Conversation.objects.count()
    total_messages = Message.objects.count()

    # Usage metrics
    usage_stats = UsageLog.objects.filter(
        created_at__date=yesterday
    ).aggregate(
        total_tokens=Sum('tokens_used'),
        total_cost=Sum('estimated_cost'),
        avg_response=Avg('processing_time_ms'),
    )

    # Create or update system metrics
    SystemMetrics.objects.update_or_create(
        date=yesterday,
        defaults={
            'total_users': total_users,
            'active_users': active_users,
            'new_users': new_users,
            'total_documents': total_documents,
            'documents_processed': documents_processed,
            'total_chunks': total_chunks,
            'total_conversations': total_conversations,
            'total_messages': total_messages,
            'total_tokens_used': usage_stats['total_tokens'] or 0,
            'estimated_total_cost': usage_stats['total_cost'] or 0,
            'avg_response_time_ms': int(usage_stats['avg_response'] or 0),
        }
    )

    logger.info(f"Generated system metrics for {yesterday}")
    return {'date': str(yesterday)}


@shared_task
def cleanup_old_usage_logs():
    """Clean up usage logs older than 90 days."""
    from .models import UsageLog

    cutoff_date = timezone.now() - timedelta(days=90)

    deleted_count, _ = UsageLog.objects.filter(
        created_at__lt=cutoff_date
    ).delete()

    logger.info(f"Deleted {deleted_count} old usage logs")
    return {'deleted_count': deleted_count}
