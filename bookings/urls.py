from django.urls import path
from .views import (
    BookingCreateView, BookingListView, BookingDetailView, 
    VerifyPaymentView, CustomerListView, PaymentListView,
    PassListView, BuyMonthlyPassView, VerifyPassPaymentView
)

urlpatterns = [
    path('', BookingListView.as_view(), name='booking-list'),
    path('customers/', CustomerListView.as_view(), name='customer-list'),
    path('payments/', PaymentListView.as_view(), name='payment-list'),
    path('create/', BookingCreateView.as_view(), name='booking-create'),
    path('<uuid:pk>/', BookingDetailView.as_view(), name='booking-detail'),
    path('verify-payment/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('passes/', PassListView.as_view(), name='pass-list'),
    path('passes/buy/', BuyMonthlyPassView.as_view(), name='pass-buy'),
    path('passes/verify/', VerifyPassPaymentView.as_view(), name='pass-verify'),
]
