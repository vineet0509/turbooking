from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Slot, SlotTemplate
from tenants.models import TurfGround
from datetime import date, timedelta, datetime


class IsTurfOwner(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'turf_owner'


class SlotListCreateView(APIView):
    permission_classes = [IsTurfOwner]

    def get(self, request):
        tenant = request.user.owned_tenant
        query_date = request.query_params.get('date')
        slots = Slot.objects.filter(tenant=tenant).select_related('turf')
        if query_date:
            slots = slots.filter(date=query_date)
        data = [{
            'id': str(s.id),
            'turf': s.turf.name,
            'turf_id': str(s.turf_id),
            'date': str(s.date),
            'start_time': str(s.start_time),
            'end_time': str(s.end_time),
            'price': float(s.price),
            'status': s.status,
        } for s in slots]
        return Response(data)

    def post(self, request):
        tenant = request.user.owned_tenant
        try:
            turf = TurfGround.objects.get(pk=request.data['turf_id'], tenant=tenant)
        except TurfGround.DoesNotExist:
            return Response({'error': 'Turf not found'}, status=404)

        slot = Slot.objects.create(
            tenant=tenant,
            turf=turf,
            date=request.data['date'],
            start_time=request.data['start_time'],
            end_time=request.data['end_time'],
            price=request.data.get('price', turf.price_per_hour),
        )
        return Response({'id': str(slot.id), 'message': 'Slot created'}, status=201)


class SlotDetailView(APIView):
    permission_classes = [IsTurfOwner]

    def patch(self, request, pk):
        try:
            slot = Slot.objects.get(pk=pk, tenant=request.user.owned_tenant)
        except Slot.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        new_status = request.data.get('status')
        if new_status in ['available', 'blocked']:
            slot.status = new_status
            slot.save()
            return Response({'message': f'Slot {new_status}'})
        return Response({'error': 'Invalid status'}, status=400)

    def delete(self, request, pk):
        try:
            slot = Slot.objects.get(pk=pk, tenant=request.user.owned_tenant, status='available')
        except Slot.DoesNotExist:
            return Response({'error': 'Not found or already booked'}, status=404)
        slot.delete()
        return Response(status=204)


class SlotTemplateView(APIView):
    permission_classes = [IsTurfOwner]

    def get(self, request):
        tenant = request.user.owned_tenant
        templates = SlotTemplate.objects.filter(tenant=tenant).select_related('turf')
        data = [{
            'id': str(t.id),
            'turf': t.turf.name,
            'day': t.get_day_of_week_display(),
            'start_time': str(t.start_time),
            'end_time': str(t.end_time),
            'is_active': t.is_active,
        } for t in templates]
        return Response(data)

    def post(self, request):
        tenant = request.user.owned_tenant
        try:
            turf = TurfGround.objects.get(pk=request.data['turf_id'], tenant=tenant)
        except TurfGround.DoesNotExist:
            return Response({'error': 'Turf not found'}, status=404)

        template, created = SlotTemplate.objects.get_or_create(
            tenant=tenant,
            turf=turf,
            day_of_week=request.data['day_of_week'],
            start_time=request.data['start_time'],
            defaults={'end_time': request.data['end_time']}
        )
        return Response({'created': created, 'id': str(template.id)}, status=201 if created else 200)


class GenerateSlotsView(APIView):
    """Generate slots from templates for a date range"""
    permission_classes = [IsTurfOwner]

    def post(self, request):
        tenant = request.user.owned_tenant
        start_date = datetime.strptime(request.data['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(request.data['end_date'], '%Y-%m-%d').date()

        if (end_date - start_date).days > 30:
            return Response({'error': 'Max 30 days at a time'}, status=400)

        templates = SlotTemplate.objects.filter(tenant=tenant, is_active=True)
        created_count = 0
        current = start_date

        while current <= end_date:
            day_of_week = current.weekday()
            day_templates = templates.filter(day_of_week=day_of_week)
            for tmpl in day_templates:
                is_weekend = day_of_week >= 5
                price = tmpl.turf.weekend_price_per_hour if is_weekend else tmpl.turf.price_per_hour
                _, created = Slot.objects.get_or_create(
                    tenant=tenant,
                    turf=tmpl.turf,
                    date=current,
                    start_time=tmpl.start_time,
                    defaults={'end_time': tmpl.end_time, 'price': price}
                )
                if created:
                    created_count += 1
            current += timedelta(days=1)

        return Response({'message': f'{created_count} slots generated successfully.'})
