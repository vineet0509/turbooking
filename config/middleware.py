"""
Tenant Middleware — Resolves current tenant from subdomain
"""
from django.utils.deprecation import MiddlewareMixin


class TenantMiddleware(MiddlewareMixin):
    """
    Extracts subdomain from HTTP_HOST and attaches tenant to request.
    e.g. greenturf.localhost → subdomain = 'greenturf'
    """

    def process_request(self, request):
        host = request.get_host().lower().split(':')[0]  # strip port
        platform_domain = 'localhost'

        parts = host.split('.')
        request.subdomain = None
        request.tenant = None

        # If host has subdomain (e.g. greenturf.localhost or greenturf.turfbook.com)
        if len(parts) > 1 and parts[0] not in ('www', 'app', 'api'):
            subdomain = parts[0]
            request.subdomain = subdomain
            # Lazy-load tenant to avoid circular imports
            try:
                from tenants.models import Tenant
                tenant = Tenant.objects.filter(subdomain=subdomain, is_active=True).first()
                request.tenant = tenant
            except Exception:
                request.tenant = None
