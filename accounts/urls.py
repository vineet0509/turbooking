from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    TurfOwnerRegisterView, CustomerRegisterView,
    LoginView, ProfileView, ChangePasswordView,
)

urlpatterns = [
    path('register/', TurfOwnerRegisterView.as_view(), name='turf-owner-register'),
    path('customer/register/', CustomerRegisterView.as_view(), name='customer-register'),
    path('login/', LoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
]
