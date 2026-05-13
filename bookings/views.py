import razorpay
import hmac
import hashlib
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from slots.models import Slot
from .models import Booking, Payment

razorpay_client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)


class BookingCreateView(APIView):
    """Create a booking + Razorpay order"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        slot_id = request.data.get('slot_id')
        try:
            slot = Slot.objects.get(pk=slot_id, status=Slot.AVAILABLE)
        except Slot.DoesNotExist:
            return Response({'error': 'Slot not available'}, status=400)

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

        # Verify signature
        generated_sig = hmac.new(
            settings.RAZORPAY_KEY_SECRET.encode(),
            f'{order_id}|{payment_id}'.encode(),
            hashlib.sha256
        ).hexdigest()

        if generated_sig != signature:
            return Response({'error': 'Payment verification failed.'}, status=400)

        try:
            payment = Payment.objects.get(razorpay_order_id=order_id)
        except Payment.DoesNotExist:
            return Response({'error': 'Payment record not found.'}, status=404)

        payment.razorpay_payment_id = payment_id
        payment.razorpay_signature = signature
        payment.status = Payment.SUCCESS
        payment.paid_at = timezone.now()
        payment.save()

        booking = payment.booking
        booking.status = Booking.CONFIRMED
        booking.save()

        return Response({
            'message': 'Payment successful! Booking confirmed.',
            'booking_ref': booking.booking_ref,
            'status': booking.status,
        })


class BookingListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'turf_owner':
            bookings = Booking.objects.filter(tenant=user.owned_tenant).select_related('slot', 'customer')
        else:
            bookings = Booking.objects.filter(customer=user).select_related('slot', 'turf')

        data = [{
            'id': str(b.id),
            'booking_ref': b.booking_ref,
            'turf': b.turf.name,
            'date': str(b.slot.date),
            'start_time': str(b.slot.start_time),
            'end_time': str(b.slot.end_time),
            'amount': float(b.total_amount),
            'status': b.status,
            'created_at': b.created_at,
        } for b in bookings]
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
