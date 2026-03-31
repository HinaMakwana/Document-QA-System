"""
Utility for running background tasks in both Celery and non-Celery (sync) modes.
"""
import logging
import threading
from django.conf import settings

logger = logging.getLogger('ai_doc')

def run_async_task(task_func, *args, **kwargs):
    """
    Run a task asynchronously.
    
    If USE_SYNC_TASKS is True, it runs in a background thread to avoid blocking the web request
    and preventing 502 Bad Gateway timeouts on platforms like Render.
    
    If USE_SYNC_TASKS is False, it uses Celery's .delay() method.
    """
    use_sync = getattr(settings, 'USE_SYNC_TASKS', False)
    
    if use_sync:
        logger.info(f"Running task {task_func.__name__} in a background thread (Sync Mode)")
        
        # Celery's __call__ handles the 'self' injection automatically for bound tasks,
        # so we just pass the original args.
        thread_args = args

        thread = threading.Thread(
            target=task_func,
            args=thread_args,
            kwargs=kwargs
        )
        thread.daemon = True
        thread.start()
        return None
    else:
        # Standard Celery async execution
        return task_func.delay(*args, **kwargs)
