"""
URL patterns for the conversations app.
"""
from django.urls import path
from . import views

app_name = 'conversations'

urlpatterns = [
    # Conversations
    path('', views.ConversationListCreateView.as_view(), name='conversation-list-create'),
    path('<uuid:pk>/', views.ConversationDetailView.as_view(), name='conversation-detail'),
    path('<uuid:pk>/messages/', views.ConversationMessagesView.as_view(), name='conversation-messages'),
    path('<uuid:pk>/chat/', views.ChatView.as_view(), name='conversation-chat'),
    path('<uuid:pk>/chatStream/', views.ChatStreamView.as_view(), name='conversation-chat-stream'),
    path('<uuid:pk>/clear/', views.ConversationClearView.as_view(), name='conversation-clear'),

    # Quick question (no conversation needed)
    path('quick/', views.QuickQuestionView.as_view(), name='quick-question'),

    # Feedback
    path('messages/<uuid:message_id>/feedback/', views.MessageFeedbackView.as_view(), name='message-feedback'),
]
