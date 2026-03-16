"""
Custom exception handlers for the API.
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides consistent error responses.
    """
    response = exception_handler(exc, context)

    if response is not None:
        custom_response_data = {
            'success': False,
            'error': {
                'code': response.status_code,
                'message': get_error_message(response),
                'details': response.data if isinstance(response.data, dict) else {'detail': response.data}
            }
        }
        response.data = custom_response_data

    return response


def get_error_message(response):
    """Extract a human-readable error message from the response."""
    if hasattr(response, 'data'):
        if isinstance(response.data, dict):
            if 'detail' in response.data:
                return str(response.data['detail'])
            elif 'non_field_errors' in response.data:
                return str(response.data['non_field_errors'][0])
        elif isinstance(response.data, list):
            return str(response.data[0])

    status_messages = {
        400: 'Bad Request',
        401: 'Authentication Required',
        403: 'Permission Denied',
        404: 'Not Found',
        429: 'Rate Limit Exceeded',
        500: 'Internal Server Error',
    }
    return status_messages.get(response.status_code, 'An error occurred')
