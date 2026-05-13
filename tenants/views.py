from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Tenant, TurfGround
from .serializers import TenantSerializer, TenantSetupSerializer, TurfGroundSerializer


class IsTurfOwner(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == 'turf_owner'


class TenantSetupView(APIView):
    permission_classes = [IsTurfOwner]

    def post(self, request):
        if hasattr(request.user, 'owned_tenant'):
            return Response({'error': 'Turf already set up.'}, status=400)
        serializer = TenantSetupSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            tenant = serializer.save()
            return Response({'message': 'Turf registered! Awaiting admin approval.',
                             'subdomain': tenant.subdomain}, status=201)
        return Response(serializer.errors, status=400)


class TenantProfileView(APIView):
    permission_classes = [IsTurfOwner]

    def get_tenant(self, user):
        try:
            return user.owned_tenant
        except Tenant.DoesNotExist:
            return None

    def get(self, request):
        tenant = self.get_tenant(request.user)
        if not tenant:
            return Response({'error': 'No turf set up yet.'}, status=404)
        return Response(TenantSerializer(tenant).data)

    def put(self, request):
        tenant = self.get_tenant(request.user)
        if not tenant:
            return Response({'error': 'No turf set up yet.'}, status=404)
        serializer = TenantSerializer(tenant, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class TurfGroundListCreateView(APIView):
    permission_classes = [IsTurfOwner]

    def get(self, request):
        tenant = request.user.owned_tenant
        turfs = TurfGround.objects.filter(tenant=tenant)
        return Response(TurfGroundSerializer(turfs, many=True).data)

    def post(self, request):
        tenant = request.user.owned_tenant
        serializer = TurfGroundSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(tenant=tenant)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class TurfGroundDetailView(APIView):
    permission_classes = [IsTurfOwner]

    def get_object(self, request, pk):
        try:
            return TurfGround.objects.get(pk=pk, tenant=request.user.owned_tenant)
        except TurfGround.DoesNotExist:
            return None

    def get(self, request, pk):
        turf = self.get_object(request, pk)
        if not turf:
            return Response({'error': 'Not found'}, status=404)
        return Response(TurfGroundSerializer(turf).data)

    def put(self, request, pk):
        turf = self.get_object(request, pk)
        if not turf:
            return Response({'error': 'Not found'}, status=404)
        serializer = TurfGroundSerializer(turf, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        turf = self.get_object(request, pk)
        if not turf:
            return Response({'error': 'Not found'}, status=404)
        turf.delete()
        return Response(status=204)
