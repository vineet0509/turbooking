from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'phone', 'first_name', 'last_name', 'role', 'date_joined']
        read_only_fields = ['id', 'role', 'date_joined']


class TurfOwnerRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'phone', 'first_name', 'last_name', 'password', 'confirm_password']

    def validate(self, data):
        if data['password'] != data.pop('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        from django.db import transaction
        from django.utils import timezone
        from datetime import timedelta
        from django.utils.text import slugify
        from tenants.models import Tenant
        from subscriptions.models import SubscriptionPlan, TenantSubscription

        # Get business name from extra fields if provided, else use first_name
        business_name = self.context.get('request').data.get('business_name') or f"{validated_data['first_name']}'s Turf"
        
        with transaction.atomic():
            user = User.objects.create_user(
                role=User.TURF_OWNER,
                **validated_data
            )

            # Create Tenant
            subdomain = slugify(business_name)
            # Ensure subdomain is unique
            base_subdomain = subdomain
            counter = 1
            while Tenant.objects.filter(subdomain=subdomain).exists():
                subdomain = f"{base_subdomain}-{counter}"
                counter += 1

            tenant = Tenant.objects.create(
                owner=user,
                name=business_name,
                subdomain=subdomain,
                email=user.email,
                phone=user.phone
            )

            # Create 10-day Trial Subscription
            plan_name = self.context.get('request').data.get('plan', 'pro')
            try:
                plan = SubscriptionPlan.objects.get(name=plan_name)
            except SubscriptionPlan.DoesNotExist:
                plan = SubscriptionPlan.objects.get(name='pro')

            TenantSubscription.objects.create(
                tenant=tenant,
                plan=plan,
                status=TenantSubscription.TRIAL,
                start_date=timezone.now().date(),
                end_date=timezone.now().date() + timedelta(days=10)
            )

        return user


class CustomerRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['email', 'phone', 'first_name', 'last_name', 'password']

    def create(self, validated_data):
        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None)
        user = User.objects.create_user(
            role=User.CUSTOMER,
            tenant=tenant,
            **validated_data
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(email=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        if not user.is_active:
            raise serializers.ValidationError('Account is disabled.')
        data['user'] = user
        return data


class TokenResponseSerializer(serializers.Serializer):
    """Helper to generate token response"""

    @staticmethod
    def get_tokens(user):
        refresh = RefreshToken.for_user(user)
        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data,
        }
