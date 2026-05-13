from django.urls import path
from .views import SlotListCreateView, SlotDetailView, SlotTemplateView, GenerateSlotsView

urlpatterns = [
    path('', SlotListCreateView.as_view(), name='slot-list-create'),
    path('<uuid:pk>/', SlotDetailView.as_view(), name='slot-detail'),
    path('templates/', SlotTemplateView.as_view(), name='slot-templates'),
    path('generate/', GenerateSlotsView.as_view(), name='generate-slots'),
]
