from django.urls import path
from .views import TenantSetupView, TenantProfileView, TurfGroundListCreateView, TurfGroundDetailView

urlpatterns = [
    path('setup/', TenantSetupView.as_view(), name='tenant-setup'),
    path('profile/', TenantProfileView.as_view(), name='tenant-profile'),
    path('turf/', TurfGroundListCreateView.as_view(), name='turf-list-create'),
    path('turf/<uuid:pk>/', TurfGroundDetailView.as_view(), name='turf-detail'),
]
