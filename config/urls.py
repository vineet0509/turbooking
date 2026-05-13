from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth endpoints
    path('api/auth/', include('accounts.urls')),

    # Tenant (Turf Owner) endpoints
    path('api/tenant/', include('tenants.urls')),

    # Slot management
    path('api/slots/', include('slots.urls')),

    # Booking engine
    path('api/bookings/', include('bookings.urls')),

    # Payment endpoints
    path('api/payments/', include('payments.urls')),

    # Subscription plans
    path('api/subscriptions/', include('subscriptions.urls')),

    # Super Admin endpoints
    path('api/super-admin/', include('accounts.admin_urls')),

    # Public endpoints (customer-facing, subdomain-aware)
    path('api/public/', include('tenants.public_urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
