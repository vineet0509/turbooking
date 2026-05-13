from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from .serializers import (
    TurfOwnerRegisterSerializer,
    CustomerRegisterSerializer,
    LoginSerializer,
    TokenResponseSerializer,
    UserSerializer,
)


class TurfOwnerRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = TurfOwnerRegisterSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.save()
            tokens = TokenResponseSerializer.get_tokens(user)
            return Response({'message': 'Account created! Please set up your turf.', **tokens}, status=201)
        return Response(serializer.errors, status=400)


class CustomerRegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomerRegisterSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = serializer.save()
            tokens = TokenResponseSerializer.get_tokens(user)
            return Response({'message': 'Welcome! Your account is ready.', **tokens}, status=201)
        return Response(serializer.errors, status=400)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            return Response(TokenResponseSerializer.get_tokens(user))
        return Response(serializer.errors, status=401)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if not user.check_password(request.data.get('old_password', '')):
            return Response({'error': 'Current password is incorrect.'}, status=400)
        new_password = request.data.get('new_password', '')
        if len(new_password) < 8:
            return Response({'error': 'Password must be at least 8 characters.'}, status=400)
        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password changed successfully.'})
