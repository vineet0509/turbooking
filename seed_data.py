"""
Seed script — creates Super Admin + default subscription plans
Run: python seed_data.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from accounts.models import User
from subscriptions.models import SubscriptionPlan

# Create Super Admin
if not User.objects.filter(email='admin@turfbook.com').exists():
    User.objects.create_superuser(
        email='admin@turfbook.com',
        password='Admin@123',
        first_name='Super',
        last_name='Admin',
    )
    print('OK: Super Admin created: admin@turfbook.com / Admin@123')
else:
    print('[INFO] Super Admin already exists')

# Create Subscription Plans
plans = [
    {
        'name': 'starter',
        'display_name': 'Starter',
        'price_monthly': 499,
        'price_yearly': 4999,
        'max_turfs': 1,
        'max_bookings_per_month': 100,
        'features': [
            '1 Turf Ground',
            'Up to 100 bookings/month',
            'Basic customization (colors, logo)',
            'Booking calendar',
            'Email notifications',
            'Standard support',
        ],
        'sort_order': 1,
    },
    {
        'name': 'pro',
        'display_name': 'Pro',
        'price_monthly': 999,
        'price_yearly': 9999,
        'max_turfs': 3,
        'max_bookings_per_month': -1,
        'features': [
            'Up to 3 Turf Grounds',
            'Unlimited bookings',
            'Full site customization',
            'Analytics dashboard',
            'Razorpay payment integration',
            'WhatsApp notifications',
            'Priority support',
        ],
        'sort_order': 2,
    },
    {
        'name': 'business',
        'display_name': 'Business',
        'price_monthly': 1999,
        'price_yearly': 19999,
        'max_turfs': 10,
        'max_bookings_per_month': -1,
        'features': [
            'Up to 10 Turf Grounds',
            'Unlimited bookings',
            'Full customization + custom domain',
            'Advanced analytics & reports',
            'Razorpay + offline payment tracking',
            'WhatsApp + SMS notifications',
            'Dedicated support',
            'Revenue reports',
        ],
        'sort_order': 3,
    },
]

for plan_data in plans:
    plan, created = SubscriptionPlan.objects.update_or_create(
        name=plan_data['name'],
        defaults=plan_data
    )
    status = 'created' if created else 'updated'
    print(f'OK: Plan "{plan.display_name}" {status} — Rs.{plan.price_monthly}/mo | Rs.{plan.price_yearly}/yr')

print('\nSeed data loaded successfully!')
print('Backend: http://localhost:8000')
print('API docs: Check turf_saas_plan.md for all endpoints')
