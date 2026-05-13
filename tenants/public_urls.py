from django.urls import path
from .public_views import TenantPublicView, PublicSlotListView

urlpatterns = [
    path('tenant/', TenantPublicView.as_view(), name='public-tenant'),
    path('slots/', PublicSlotListView.as_view(), name='public-slots'),
]
