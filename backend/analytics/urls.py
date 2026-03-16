"""
URL patterns for the analytics app.
"""
from django.urls import path
from . import views

app_name = 'analytics'

urlpatterns = [
    # User analytics
    path('usage/', views.UserUsageStatsView.as_view(), name='user-usage'),
    path('usage/history/', views.UsageHistoryView.as_view(), name='usage-history'),
    path('usage/daily/', views.DailySummaryView.as_view(), name='daily-summary'),
    path('cost-estimate/', views.UserCostEstimateView.as_view(), name='cost-estimate'),

    # Admin analytics
    path('admin/dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/users/<uuid:user_id>/usage/', views.AdminUserUsageView.as_view(), name='admin-user-usage'),
    path('admin/export/', views.ExportUsageView.as_view(), name='admin-export'),
]
