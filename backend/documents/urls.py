"""
URL patterns for the documents app.
"""
from django.urls import path
from . import views
from .chat_upload import ChatDocumentUploadView, UploadQuotaView

app_name = 'documents'

urlpatterns = [
    path('', views.DocumentListCreateView.as_view(), name='document-list-create'),
    path('upload/', views.DocumentListCreateView.as_view(), name='document-upload'),
    path('chat-upload/', ChatDocumentUploadView.as_view(), name='chat-upload'),
    path('upload-quota/', UploadQuotaView.as_view(), name='upload-quota'),
    path('<uuid:pk>/', views.DocumentDetailView.as_view(), name='document-detail'),
    path('<uuid:pk>/status/', views.DocumentProcessingStatusView.as_view(), name='document-status'),
    path('<uuid:pk>/reprocess/', views.DocumentReprocessView.as_view(), name='document-reprocess'),
    path('<uuid:document_id>/chunks/', views.DocumentChunkListView.as_view(), name='document-chunks'),
]
