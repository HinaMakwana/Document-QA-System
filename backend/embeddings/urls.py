"""
URL patterns for the embeddings app.
"""
from django.urls import path
from . import views

app_name = 'embeddings'

urlpatterns = [
    path('search/', views.SemanticSearchView.as_view(), name='semantic-search'),
    path('stats/', views.VectorStoreStatsView.as_view(), name='vector-store-stats'),
    path('rebuild/<uuid:document_id>/', views.RebuildEmbeddingsView.as_view(), name='rebuild-embeddings'),
]
