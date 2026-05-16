from rest_framework import serializers
from .models import Tenant, TurfGround


class TurfGroundSerializer(serializers.ModelSerializer):
    class Meta:
        model = TurfGround
        fields = ['id', 'name', 'turf_type', 'description', 'capacity',
                  'pitch_type', 'price_per_hour', 'weekend_price_per_hour',
                  'images', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class TenantSerializer(serializers.ModelSerializer):
    turfs = TurfGroundSerializer(many=True, read_only=True)
    owner_name = serializers.CharField(source='owner.full_name', read_only=True)
    owner_email = serializers.CharField(source='owner.email', read_only=True)

    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'subdomain', 'status', 'is_active',
            'description', 'address', 'city', 'state', 'pincode',
            'phone', 'email', 'google_maps_url',
            'logo', 'banner_image', 'primary_color', 'secondary_color', 'tagline',
            'amenities', 'instagram_url', 'facebook_url', 'whatsapp_number',
            'owner_name', 'owner_email', 'turfs', 'created_at',
        ]
        read_only_fields = ['id', 'status', 'owner_name', 'owner_email', 'created_at']


class TenantSetupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ['name', 'subdomain', 'description', 'address', 'city',
                  'state', 'pincode', 'phone', 'email']

    def validate_subdomain(self, value):
        value = value.lower().strip()
        if Tenant.objects.filter(subdomain=value).exists():
            raise serializers.ValidationError('This subdomain is already taken.')
        reserved = ['www', 'app', 'api', 'admin', 'mail', 'ftp']
        if value in reserved:
            raise serializers.ValidationError('This subdomain is reserved.')
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        tenant = Tenant.objects.create(owner=request.user, **validated_data)
        
        # Create default 14-day trial
        from subscriptions.models import SubscriptionPlan, TenantSubscription
        from django.utils import timezone
        from datetime import timedelta
        
        plan = SubscriptionPlan.objects.filter(name='starter').first()
        if plan:
            TenantSubscription.objects.create(
                tenant=tenant,
                plan=plan,
                status=TenantSubscription.TRIAL,
                start_date=timezone.now().date(),
                end_date=timezone.now().date() + timedelta(days=14)
            )
        return tenant


class TenantPublicSerializer(serializers.ModelSerializer):
    """Minimal public data for customer-facing site"""
    turfs = TurfGroundSerializer(many=True, read_only=True)

    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'subdomain', 'description', 'city',
            'phone', 'email', 'logo', 'banner_image',
            'primary_color', 'secondary_color', 'tagline',
            'amenities', 'google_maps_url', 'instagram_url',
            'facebook_url', 'whatsapp_number', 'turfs',
        ]
