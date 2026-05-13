from django.urls import path
from .views import SubscriptionPlanListView, SubscribeView, MySubscriptionView

urlpatterns = [
    path('plans/', SubscriptionPlanListView.as_view(), name='subscription-plans'),
    path('subscribe/', SubscribeView.as_view(), name='subscribe'),
    path('my-plan/', MySubscriptionView.as_view(), name='my-subscription'),
]
