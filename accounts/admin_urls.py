from django.urls import path
from .admin_views import (
    AdminTenantListView, AdminTenantDetailView,
    AdminRevenueView, AdminDashboardView, GlobalSettingsView
)

urlpatterns = [
    path('dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('tenants/', AdminTenantListView.as_view(), name='admin-tenants'),
    path('tenants/<uuid:pk>/', AdminTenantDetailView.as_view(), name='admin-tenant-detail'),
    path('revenue/', AdminRevenueView.as_view(), name='admin-revenue'),
    path('settings/', GlobalSettingsView.as_view(), name='admin-settings'),
]
