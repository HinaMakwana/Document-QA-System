from rest_framework.renderers import JSONRenderer

class CustomRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        response = renderer_context.get('response')

        # Check if the response is already in the success/error format
        if isinstance(data, dict) and ('success' in data or 'error' in data):
            # Already formatted or an error handled by custom_exception_handler
            return super().render(data, accepted_media_type, renderer_context)

        # Standardizing all successful responses
        status_code = response.status_code

        # If it's an error status but not handled by exception handler yet
        if status_code >= 400:
            return super().render({
                'success': False,
                'error': {
                    'code': status_code,
                    'message': data.get('detail', 'An error occurred') if isinstance(data, dict) else str(data)
                }
            }, accepted_media_type, renderer_context)

        # Success wrap
        formatted_data = {
            'success': True,
            'data': data
        }

        return super().render(formatted_data, accepted_media_type, renderer_context)
