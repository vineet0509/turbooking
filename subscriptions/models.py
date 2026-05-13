from django.db import models
import uuid


class SubscriptionPlan(models.Model):
    """Platform subscription plans for turf owners"""

    STARTER = 'starter'
    PRO = 'pro'
    BUSINESS = 'business'

    PLAN_CHOICES = [
        (STARTER, 'Starter'),
        (PRO, 'Pro'),
        (BUSINESS, 'Business'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=20, choices=PLAN_CHOICES, unique=True)
    display_name = models.CharField(max_length=100)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2)
    max_turfs = models.IntegerField(default=1)
    max_bookings_per_month = models.IntegerField(default=100, help_text='-1 for unlimited')
    features = models.JSONField(default=list)  # List of feature strings
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        db_table = 'subscription_plans'
        ordering = ['sort_order']

    def __str__(self):
        return self.display_name


class TenantSubscription(models.Model):
    """A tenant's active subscription"""

    MONTHLY = 'monthly'
    YEARLY = 'yearly'

    BILLING_CHOICES = [
        (MONTHLY, 'Monthly'),
        (YEARLY, 'Yearly'),
    ]

    ACTIVE = 'active'
    EXPIRED = 'expired'
    CANCELLED = 'cancelled'
    TRIAL = 'trial'

    STATUS_CHOICES = [
        (ACTIVE, 'Active'),
        (EXPIRED, 'Expired'),
        (CANCELLED, 'Cancelled'),
        (TRIAL, 'Trial'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.OneToOneField(
        'tenants.Tenant',
        on_delete=models.CASCADE,
        related_name='subscription'
    )
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT)
    billing_cycle = models.CharField(max_length=10, choices=BILLING_CHOICES, default=MONTHLY)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=TRIAL)

    start_date = models.DateField()
    end_date = models.DateField()

    # Razorpay
    razorpay_subscription_id = models.CharField(max_length=200, blank=True)
    razorpay_order_id = models.CharField(max_length=200, blank=True)

    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenant_subscriptions'

    def __str__(self):
        return f'{self.tenant.name} — {self.plan.display_name} ({self.status})'

    @property
    def is_active(self):
        from django.utils import timezone
        return self.status == self.ACTIVE and self.end_date >= timezone.now().date()
