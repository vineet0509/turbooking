from django.urls import path
from .views import SubscriptionPlanListView, SubscribeView, MySubscriptionView, VerifyPassPaymentView

urlpatterns = [
    path('plans/', SubscriptionPlanListView.as_view(), name='subscription-plans'),
    path('subscribe/', SubscribeView.as_view(), name='subscribe'),
    path('verify-payment/', VerifyPassPaymentView.as_view(), name='verify-subscription-payment'),
    path('my-plan/', MySubscriptionView.as_view(), name='my-subscription'),
]
