from django.db import models
import uuid


class Tenant(models.Model):
    """Represents a turf business on the platform"""

    PENDING = 'pending'
    APPROVED = 'approved'
    SUSPENDED = 'suspended'

    STATUS_CHOICES = [
        (PENDING, 'Pending Approval'),
        (APPROVED, 'Approved'),
        (SUSPENDED, 'Suspended'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.OneToOneField(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='owned_tenant'
    )
    name = models.CharField(max_length=200)
    subdomain = models.SlugField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    is_active = models.BooleanField(default=True)

    # Business Details
    description = models.TextField(blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)
    phone = models.CharField(max_length=15, blank=True)
    email = models.EmailField(blank=True)
    google_maps_url = models.URLField(blank=True)

    # Branding / Customization
    logo = models.ImageField(upload_to='tenant/logos/', null=True, blank=True)
    banner_image = models.ImageField(upload_to='tenant/banners/', null=True, blank=True)
    primary_color = models.CharField(max_length=7, default='#10B981')   # hex color
    secondary_color = models.CharField(max_length=7, default='#064E3B')
    tagline = models.CharField(max_length=200, blank=True)

    # Amenities
    amenities = models.JSONField(default=list, blank=True)  # ['Floodlights', 'Parking', etc.]

    # Social
    instagram_url = models.URLField(blank=True)
    facebook_url = models.URLField(blank=True)
    whatsapp_number = models.CharField(max_length=15, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenants'
        verbose_name = 'Tenant'
        verbose_name_plural = 'Tenants'

    def __str__(self):
        return f'{self.name} ({self.subdomain})'

    @property
    def site_url(self):
        return f'http://{self.subdomain}.localhost:4200'


class TurfGround(models.Model):
    """Individual turf ground within a tenant"""

    CRICKET = 'cricket'
    FOOTBALL = 'football'
    BADMINTON = 'badminton'
    MULTI = 'multi'

    TYPE_CHOICES = [
        (CRICKET, 'Cricket'),
        (FOOTBALL, 'Football'),
        (BADMINTON, 'Badminton'),
        (MULTI, 'Multi-Sport'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='turfs')
    name = models.CharField(max_length=200)
    turf_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=CRICKET)
    description = models.TextField(blank=True)
    capacity = models.IntegerField(default=22)
    pitch_type = models.CharField(max_length=100, blank=True)  # Astro turf, Cement, etc.

    # Pricing
    price_per_hour = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    weekend_price_per_hour = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    images = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'turf_grounds'
        verbose_name = 'Turf Ground'

    def __str__(self):
        return f'{self.name} — {self.tenant.name}'
