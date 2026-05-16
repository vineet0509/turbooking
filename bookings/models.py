from django.db import models
import uuid
import random
import string


def generate_booking_ref():
    return 'TRF' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))


class Booking(models.Model):
    """Customer booking for a slot"""

    PENDING = 'pending'
    CONFIRMED = 'confirmed'
    CANCELLED = 'cancelled'
    COMPLETED = 'completed'

    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (CONFIRMED, 'Confirmed'),
        (CANCELLED, 'Cancelled'),
        (COMPLETED, 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='bookings')
    turf = models.ForeignKey('tenants.TurfGround', on_delete=models.CASCADE, related_name='bookings')
    slot = models.OneToOneField('slots.Slot', on_delete=models.CASCADE, related_name='booking')
    customer = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='bookings')

    booking_ref = models.CharField(max_length=20, unique=True, default=generate_booking_ref)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    # Customer info snapshot at time of booking
    customer_name = models.CharField(max_length=200)
    customer_phone = models.CharField(max_length=15)
    customer_email = models.EmailField()

    notes = models.TextField(blank=True)
    cancelled_reason = models.TextField(blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bookings'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['tenant', 'status']),
            models.Index(fields=['customer', 'status']),
        ]

    def __str__(self):
        return f'{self.booking_ref} — {self.customer_name}'


class Payment(models.Model):
    """Payment record linked to a booking"""

    PENDING = 'pending'
    SUCCESS = 'success'
    FAILED = 'failed'
    REFUNDED = 'refunded'

    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (SUCCESS, 'Success'),
        (FAILED, 'Failed'),
        (REFUNDED, 'Refunded'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='payment')

    razorpay_order_id = models.CharField(max_length=200, unique=True)
    razorpay_payment_id = models.CharField(max_length=200, blank=True)
    razorpay_signature = models.CharField(max_length=500, blank=True)

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=5, default='INR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)

    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments'

    def __str__(self):
        return f'Payment for {self.booking.booking_ref} — {self.status}'


class MonthlyPass(models.Model):
    """Monthly pass purchased by a customer for an arena"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey('tenants.Tenant', on_delete=models.CASCADE, related_name='passes')
    customer = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='passes')
    
    price = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField()
    
    total_bookings_allowed = models.IntegerField(default=30)
    bookings_used = models.IntegerField(default=0)
    
    is_active = models.BooleanField(default=True)
    payment = models.OneToOneField(Payment, on_delete=models.SET_NULL, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'monthly_passes'
        verbose_name_plural = 'Monthly Passes'

    def __str__(self):
        return f'Pass: {self.customer.full_name} @ {self.tenant.name}'

    @property
    def remaining_bookings(self):
        return self.total_bookings_allowed - self.bookings_used
