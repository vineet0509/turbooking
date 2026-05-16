import razorpay
import hmac
import hashlib
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from slots.models import Slot
from tenants.models import Tenant
from .models import Booking, Payment, MonthlyPass

def get_razorpay_client(tenant):
    """Return a Razorpay client using the tenant's specific keys"""
    if tenant.razorpay_key_id and tenant.razorpay_key_secret:
        if 'your_key_id' not in tenant.razorpay_key_id:
            return razorpay.Client(auth=(tenant.razorpay_key_id, tenant.razorpay_key_secret))
    
    # Fallback to platform keys
    if 'your_key_id' in settings.RAZORPAY_KEY_ID:
        raise Exception("Razorpay Keys not configured. Please set them in Settings.")
        
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


class BookingCreateView(APIView):
    """Create a booking + Razorpay order"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        slot_id = request.data.get('slot_id')
        try:
            slot = Slot.objects.get(pk=slot_id, status=Slot.AVAILABLE)
        except Slot.DoesNotExist:
            return Response({'error': 'Slot not available'}, status=400)

        # Check Subscription Validity
        if not hasattr(slot.tenant, 'subscription') or not slot.tenant.subscription.is_valid:
            return Response({'error': 'Booking failed: This arena\'s subscription has expired.'}, status=403)

        # Create booking (pending)
        booking = Booking.objects.create(
            tenant=slot.tenant,
            turf=slot.turf,
            slot=slot,
            customer=request.user,
            total_amount=slot.price,
            customer_name=request.user.full_name,
            customer_phone=request.user.phone,
            customer_email=request.user.email,
        )

        # Mark slot as booked optimistically
        slot.status = Slot.BOOKED
        slot.save()

        # Check if paying with pass
        use_pass = request.data.get('use_pass', False)
        if use_pass:
            active_pass = MonthlyPass.objects.filter(
                tenant=slot.tenant, customer=request.user, 
                is_active=True, end_date__gte=timezone.now().date(),
                bookings_used__lt=30 # Assuming 30 is default, or use F expression
            ).filter(models.Q(bookings_used__lt=models.F('total_bookings_allowed'))).first()
            
            if active_pass:
                booking.status = Booking.CONFIRMED
                booking.total_amount = 0
                booking.save()
                
                active_pass.bookings_used += 1
                active_pass.save()
                
                return Response({
                    'message': 'Booking confirmed using monthly pass!',
                    'booking_id': str(booking.id),
                    'status': 'confirmed'
                }, status=201)

        # Create Razorpay Order
        client = get_razorpay_client(slot.tenant)
        amount_in_paise = int(booking.total_amount * 100)
        try:
            razorpay_order = client.order.create({
                'amount': amount_in_paise,
                'currency': 'INR',
                'payment_capture': '1',
                'notes': {
                    'booking_id': str(booking.id),
                    'customer_id': str(request.user.id)
                }
            })
            
            booking.razorpay_order_id = razorpay_order['id']
            booking.save()
            
            return Response({
                'booking_id': str(booking.id),
                'razorpay_order_id': razorpay_order['id'],
                'amount': booking.total_amount,
                'key_id': slot.tenant.razorpay_key_id or settings.RAZORPAY_KEY_ID,
                'status': 'pending_payment'
            })
        except Exception as e:
            # Rollback slot status
            slot.status = Slot.AVAILABLE
            slot.save()
            booking.delete()
            return Response({'error': f'Payment gateway error: {str(e)}'}, status=500)

        # Create Razorpay order
        amount_paise = int(slot.price * 100)
        try:
            rz_order = razorpay_client.order.create({
                'amount': amount_paise,
                'currency': 'INR',
                'receipt': booking.booking_ref,
                'notes': {
                    'booking_id': str(booking.id),
                    'tenant': slot.tenant.name,
                }
            })
        except Exception as e:
            # Rollback on Razorpay failure
            slot.status = Slot.AVAILABLE
            slot.save()
            booking.delete()
            return Response({'error': 'Payment gateway error. Try again.'}, status=500)

        # Create payment record
        payment = Payment.objects.create(
            booking=booking,
            razorpay_order_id=rz_order['id'],
            amount=slot.price,
        )

        return Response({
            'booking_id': str(booking.id),
            'booking_ref': booking.booking_ref,
            'razorpay_order_id': rz_order['id'],
            'razorpay_key_id': settings.RAZORPAY_KEY_ID,
            'amount': amount_paise,
            'currency': 'INR',
        }, status=201)


class VerifyPaymentView(APIView):
    """Verify Razorpay payment signature and confirm booking"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('razorpay_order_id')
        payment_id = request.data.get('razorpay_payment_id')
        signature = request.data.get('razorpay_signature')

        # Get Booking and Tenant
        try:
            booking = Booking.objects.get(razorpay_order_id=order_id)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=404)

        # Verify signature
        client = get_razorpay_client(booking.tenant)
        key_secret = booking.tenant.razorpay_key_secret or settings.RAZORPAY_KEY_SECRET
        
        generated_sig = hmac.new(
            key_secret.encode(),
            f'{order_id}|{payment_id}'.encode(),
            hashlib.sha256
        ).hexdigest()

        if generated_sig == signature:
            try:
                booking = Booking.objects.get(razorpay_order_id=order_id)
                booking.status = Booking.CONFIRMED
                booking.razorpay_payment_id = payment_id
                booking.save()
                
                # Record Payment
                Payment.objects.update_or_create(
                    razorpay_order_id=order_id,
                    defaults={
                        'booking': booking,
                        'razorpay_payment_id': payment_id,
                        'amount': booking.total_amount,
                        'status': 'success',
                        'payment_method': 'razorpay'
                    }
                )
                
                return Response({
                    'message': 'Payment successful! Booking confirmed.',
                    'booking_ref': booking.booking_ref,
                    'status': booking.status,
                })
            except Booking.DoesNotExist:
                return Response({'error': 'Booking not found for this order'}, status=404)
        else:
            return Response({'error': 'Invalid payment signature'}, status=400)


class BookingListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'turf_owner':
            bookings = Booking.objects.filter(tenant=user.owned_tenant).select_related('slot', 'turf', 'customer')
        else:
            bookings = Booking.objects.filter(customer=user).select_related('slot', 'turf')

        data = [{
            'id': str(b.id),
            'booking_ref': b.booking_ref,
            'turf': b.turf.name,
            'customer': b.customer_name,
            'email': b.customer_email,
            'phone': b.customer_phone,
            'date': str(b.slot.date),
            'start_time': str(b.slot.start_time),
            'end_time': str(b.slot.end_time),
            'amount': float(b.total_amount),
            'status': b.status,
            'created_at': b.created_at,
        } for b in bookings]
        return Response(data)


class CustomerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'turf_owner':
            return Response({'error': 'Unauthorized'}, status=403)
        
        tenant = request.user.owned_tenant
        from django.db.models import Count, Max
        
        customers = Booking.objects.filter(tenant=tenant).values(
            'customer_email', 'customer_name', 'customer_phone'
        ).annotate(
            totalBookings=Count('id'),
            lastBooking=Max('slot__date')
        ).order_by('-lastBooking')

        data = [{
            'name': c['customer_name'],
            'email': c['customer_email'],
            'phone': c['customer_phone'],
            'totalBookings': c['totalBookings'],
            'lastBooking': str(c['lastBooking']),
        } for c in customers]
        
        return Response(data)


class PaymentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'turf_owner':
            return Response({'error': 'Unauthorized'}, status=403)
            
        tenant = request.user.owned_tenant
        payments = Payment.objects.filter(booking__tenant=tenant).select_related('booking')
        
        data = [{
            'id': str(p.id),
            'date': str(p.created_at),
            'customer': p.booking.customer_name,
            'amount': float(p.amount),
            'method': 'Razorpay',
            'status': p.status,
            'booking_ref': p.booking.booking_ref
        } for p in payments]
        
        return Response(data)


class BuyMonthlyPassView(APIView):
    """Initiate monthly pass purchase"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        tenant_id = request.data.get('tenant_id')
        try:
            tenant = Tenant.objects.get(pk=tenant_id)
        except Tenant.DoesNotExist:
            return Response({'error': 'Tenant not found'}, status=404)

        if tenant.monthly_pass_price <= 0:
            return Response({'error': 'Monthly pass not available for this arena'}, status=400)

        amount_paise = int(tenant.monthly_pass_price * 100)
        client = get_razorpay_client(tenant)
        rz_order = client.order.create({
            'amount': amount_paise,
            'currency': 'INR',
            'notes': {
                'type': 'monthly_pass',
                'tenant_id': str(tenant.id),
                'customer_id': str(request.user.id)
            }
        })

        return Response({
            'razorpay_order_id': rz_order['id'],
            'razorpay_key_id': tenant.razorpay_key_id or settings.RAZORPAY_KEY_ID,
            'amount': amount_paise,
            'currency': 'INR',
            'tenant_name': tenant.name
        })


class VerifyPassPaymentView(APIView):
    """Verify payment and activate monthly pass"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get('razorpay_order_id')
        payment_id = request.data.get('razorpay_payment_id')
        signature = request.data.get('razorpay_signature')
        tenant_id = request.data.get('tenant_id')

        # Verify signature
        try:
            tenant = Tenant.objects.get(pk=tenant_id)
        except Tenant.DoesNotExist:
            return Response({'error': 'Tenant not found'}, status=404)

        client = get_razorpay_client(tenant)
        key_secret = tenant.razorpay_key_secret or settings.RAZORPAY_KEY_SECRET

        generated_sig = hmac.new(
            key_secret.encode(),
            f'{order_id}|{payment_id}'.encode(),
            hashlib.sha256
        ).hexdigest()

        if generated_sig != signature:
            return Response({'error': 'Payment verification failed.'}, status=400)

        tenant = Tenant.objects.get(pk=tenant_id)
        
        # Create MonthlyPass
        start_date = timezone.now().date()
        end_date = start_date + timezone.timedelta(days=30)
        
        pass_obj = MonthlyPass.objects.create(
            tenant=tenant,
            customer=request.user,
            price=tenant.monthly_pass_price,
            start_date=start_date,
            end_date=end_date,
            total_bookings_allowed=tenant.monthly_pass_bookings,
            is_active=True
        )

        return Response({
            'message': 'Monthly Pass activated!',
            'end_date': str(end_date),
            'bookings_allowed': pass_obj.total_bookings_allowed
        })


class PassListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'turf_owner':
            passes = MonthlyPass.objects.filter(tenant=user.owned_tenant).select_related('customer')
        else:
            passes = MonthlyPass.objects.filter(customer=user).select_related('tenant')

        data = [{
            'id': str(p.id),
            'tenant': p.tenant.name,
            'customer': p.customer.full_name,
            'start_date': str(p.start_date),
            'end_date': str(p.end_date),
            'bookings_used': p.bookings_used,
            'total_allowed': p.total_bookings_allowed,
            'is_active': p.is_active and p.end_date >= timezone.now().date()
        } for p in passes]
        return Response(data)


class BookingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk, customer=request.user)
        except Booking.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        return Response({
            'booking_ref': booking.booking_ref,
            'turf': booking.turf.name,
            'tenant': booking.tenant.name,
            'date': str(booking.slot.date),
            'start_time': str(booking.slot.start_time),
            'end_time': str(booking.slot.end_time),
            'amount': float(booking.total_amount),
            'status': booking.status,
        })

    def delete(self, request, pk):
        """Cancel a booking"""
        try:
            booking = Booking.objects.get(pk=pk, customer=request.user, status=Booking.CONFIRMED)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found or cannot be cancelled'}, status=404)

        booking.status = Booking.CANCELLED
        booking.cancelled_at = timezone.now()
        booking.cancelled_reason = request.data.get('reason', 'Cancelled by customer')
        booking.save()

        # Free up the slot
        booking.slot.status = Slot.AVAILABLE
        booking.slot.save()

        return Response({'message': 'Booking cancelled successfully.'})
