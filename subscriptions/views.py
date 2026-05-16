from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from datetime import timedelta
from .models import SubscriptionPlan, TenantSubscription
from accounts.models import GlobalSettings
import razorpay
from django.conf import settings

def get_global_razorpay_client():
    """Return Razorpay client using Super Admin's global settings"""
    g = GlobalSettings.objects.first()
    if g and g.razorpay_key_id and g.razorpay_key_secret:
        if 'your_key_id' not in g.razorpay_key_id:
            return razorpay.Client(auth=(g.razorpay_key_id, g.razorpay_key_secret))
            
    # Fallback to .env
    if 'your_key_id' in settings.RAZORPAY_KEY_ID:
        raise Exception("Platform Razorpay Keys not configured. Please set them in Global Settings.")
        
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

def get_global_razorpay_key_id():
    g = GlobalSettings.objects.first()
    if g and g.razorpay_key_id:
        return g.razorpay_key_id
    return settings.RAZORPAY_KEY_ID

def get_global_razorpay_key_secret():
    g = GlobalSettings.objects.first()
    if g and g.razorpay_key_secret:
        return g.razorpay_key_secret
    return settings.RAZORPAY_KEY_SECRET


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
        # Calculate amount
        amount = plan.price_yearly if billing_cycle == 'yearly' else plan.price_monthly
        amount_paise = int(amount * 100)

        # Create Razorpay Order
        client = get_global_razorpay_client()
        
        try:
            rz_order = client.order.create({
                'amount': amount_paise,
                'currency': 'INR',
                'payment_capture': '1',
                'notes': {
                    'tenant_id': str(tenant.id),
                    'plan_id': str(plan.id),
                    'billing_cycle': billing_cycle
                }
            })
            
            return Response({
                'razorpay_order_id': rz_order['id'],
                'amount': float(amount),
                'key_id': get_global_razorpay_key_id(),
                'plan_name': plan.display_name,
                'status': 'pending_payment'
            })
        except Exception as e:
            return Response({'error': f'Payment gateway error: {str(e)}'}, status=500)

class VerifyPassPaymentView(APIView):
    """Verify subscription payment and activate"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        import hmac, hashlib
        from django.conf import settings
        from .models import TenantSubscription, SubscriptionPlan
        
        order_id = request.data.get('razorpay_order_id')
        payment_id = request.data.get('razorpay_payment_id')
        signature = request.data.get('razorpay_signature')
        plan_id = request.data.get('plan_id')
        billing_cycle = request.data.get('billing_cycle', 'monthly')

        # Verify signature
        key_secret = get_global_razorpay_key_secret()
        
        generated_sig = hmac.new(
            key_secret.encode(),
            f'{order_id}|{payment_id}'.encode(),
            hashlib.sha256
        ).hexdigest()

        if generated_sig == signature:
            tenant = request.user.owned_tenant
            plan = SubscriptionPlan.objects.get(pk=plan_id)
            
            start_date = timezone.now().date()
            end_date = start_date + timedelta(days=365 if billing_cycle == 'yearly' else 30)
            
            sub, _ = TenantSubscription.objects.update_or_create(
                tenant=tenant,
                defaults={
                    'plan': plan,
                    'billing_cycle': billing_cycle,
                    'status': TenantSubscription.ACTIVE,
                    'start_date': start_date,
                    'end_date': end_date,
                    'amount_paid': plan.price_yearly if billing_cycle == 'yearly' else plan.price_monthly,
                    'razorpay_order_id': order_id,
                    'razorpay_subscription_id': payment_id # Storing payment id as ref
                }
            )
            
            return Response({'message': 'Subscription activated!', 'status': 'success'})
        else:
            return Response({'error': 'Invalid payment signature'}, status=400)


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
                'is_active': sub.is_valid,
                'max_turfs': sub.plan.max_turfs,
                'features': sub.plan.features,
            })
        except Exception:
            return Response({'message': 'No active subscription.'}, status=404)
