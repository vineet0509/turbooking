from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from datetime import timedelta
from .models import SubscriptionPlan, TenantSubscription


class SubscriptionPlanListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        plans = SubscriptionPlan.objects.filter(is_active=True)
        data = [{
            'id': str(p.id),
            'name': p.name,
            'display_name': p.display_name,
            'price_monthly': float(p.price_monthly),
            'price_yearly': float(p.price_yearly),
            'max_turfs': p.max_turfs,
            'max_bookings_per_month': p.max_bookings_per_month,
            'features': p.features,
        } for p in plans]
        return Response(data)


class SubscribeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan_id = request.data.get('plan_id')
        billing_cycle = request.data.get('billing_cycle', 'monthly')

        try:
            plan = SubscriptionPlan.objects.get(pk=plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Plan not found'}, status=404)

        tenant = request.user.owned_tenant
        start_date = timezone.now().date()
        end_date = start_date + timedelta(days=365 if billing_cycle == 'yearly' else 30)
        amount = plan.price_yearly if billing_cycle == 'yearly' else plan.price_monthly

        subscription, created = TenantSubscription.objects.update_or_create(
            tenant=tenant,
            defaults={
                'plan': plan,
                'billing_cycle': billing_cycle,
                'status': TenantSubscription.ACTIVE,
                'start_date': start_date,
                'end_date': end_date,
                'amount_paid': amount,
            }
        )

        return Response({
            'message': f'Subscribed to {plan.display_name} ({billing_cycle})!',
            'end_date': str(end_date),
            'amount': float(amount),
        }, status=201 if created else 200)


class MySubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            sub = request.user.owned_tenant.subscription
            return Response({
                'plan': sub.plan.display_name,
                'billing_cycle': sub.billing_cycle,
                'status': sub.status,
                'start_date': str(sub.start_date),
                'end_date': str(sub.end_date),
                'is_active': sub.is_active,
                'max_turfs': sub.plan.max_turfs,
                'features': sub.plan.features,
            })
        except Exception:
            return Response({'message': 'No active subscription.'}, status=404)
