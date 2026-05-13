from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .serializers import TenantPublicSerializer
from slots.models import Slot


class TenantPublicView(APIView):
    """Return tenant details for customer-facing site (subdomain-aware)"""
    permission_classes = [AllowAny]

    def get(self, request):
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return Response({'error': 'Turf not found.'}, status=404)
        return Response(TenantPublicSerializer(tenant).data)


class PublicSlotListView(APIView):
    """Return available slots for a date (customer-facing)"""
    permission_classes = [AllowAny]

    def get(self, request):
        tenant = getattr(request, 'tenant', None)
        if not tenant:
            return Response({'error': 'Turf not found.'}, status=404)

        date = request.query_params.get('date')
        turf_id = request.query_params.get('turf_id')

        slots = Slot.objects.filter(
            tenant=tenant,
            status=Slot.AVAILABLE
        )
        if date:
            slots = slots.filter(date=date)
        if turf_id:
            slots = slots.filter(turf_id=turf_id)

        data = [{
            'id': str(s.id),
            'turf_id': str(s.turf_id),
            'turf_name': s.turf.name,
            'date': s.date,
            'start_time': str(s.start_time),
            'end_time': str(s.end_time),
            'price': float(s.price),
            'status': s.status,
        } for s in slots]

        return Response(data)
