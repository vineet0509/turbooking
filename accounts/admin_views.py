from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from tenants.models import Tenant
from bookings.models import Booking, Payment
from subscriptions.models import TenantSubscription
from .models import User


class IsSuperAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == User.SUPER_ADMIN


class AdminDashboardView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        total_tenants = Tenant.objects.count()
        active_tenants = Tenant.objects.filter(status='approved', is_active=True).count()
        pending_tenants = Tenant.objects.filter(status='pending').count()
        total_bookings = Booking.objects.count()
        confirmed_bookings = Booking.objects.filter(status='confirmed').count()
        total_revenue = Payment.objects.filter(status='success').values_list('amount', flat=True)
        revenue_sum = sum(total_revenue)

        return Response({
            'tenants': {
                'total': total_tenants,
                'active': active_tenants,
                'pending': pending_tenants,
            },
            'bookings': {
                'total': total_bookings,
                'confirmed': confirmed_bookings,
            },
            'revenue': {
                'total': float(revenue_sum),
            }
        })


class AdminTenantListView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        status_filter = request.query_params.get('status')
        qs = Tenant.objects.select_related('owner')
        if status_filter:
            qs = qs.filter(status=status_filter)
        data = []
        for t in qs:
            data.append({
                'id': str(t.id),
                'name': t.name,
                'subdomain': t.subdomain,
                'status': t.status,
                'owner_email': t.owner.email,
                'owner_name': t.owner.full_name,
                'city': t.city,
                'created_at': t.created_at,
            })
        return Response(data)


class AdminTenantDetailView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request, pk):
        try:
            tenant = Tenant.objects.get(pk=pk)
        except Tenant.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        return Response({
            'id': str(tenant.id),
            'name': tenant.name,
            'subdomain': tenant.subdomain,
            'status': tenant.status,
            'city': tenant.city,
            'state': tenant.state,
        })

    def patch(self, request, pk):
        """Approve or suspend a tenant"""
        try:
            tenant = Tenant.objects.get(pk=pk)
        except Tenant.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        new_status = request.data.get('status')
        if new_status in ['approved', 'suspended', 'pending']:
            tenant.status = new_status
            tenant.is_active = (new_status == 'approved')
            tenant.save()
            return Response({'message': f'Tenant status updated to {new_status}'})
        return Response({'error': 'Invalid status'}, status=400)


class AdminRevenueView(APIView):
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        payments = Payment.objects.filter(status='success').select_related('booking__tenant')
        data = []
        for p in payments:
            data.append({
                'booking_ref': p.booking.booking_ref,
                'tenant': p.booking.tenant.name,
                'amount': float(p.amount),
                'paid_at': p.paid_at,
            })
        return Response({'payments': data, 'total': sum(float(p.amount) for p in Payment.objects.filter(status='success'))})
