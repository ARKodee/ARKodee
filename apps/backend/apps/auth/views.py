from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from .serializers import (
    CheckEmailSerializer,
    LoginSerializer,
    RegisterSerializer,
    UserSerializer,
)


@api_view(["POST"])
@permission_classes([AllowAny])
def check_email_view(request):
    serializer = CheckEmailSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
    
    email = serializer.validated_data["email"]
    exists = User.objects.filter(email=email).exists()
    return Response({"exists": exists})


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        errors = serializer.errors
        if "email" in errors:
            detail_msg = errors["email"][0]
        elif "password" in errors:
            detail_msg = errors["password"][0]
        else:
            detail_msg = "Email and password are required."
        return Response({"detail": detail_msg}, status=status.HTTP_400_BAD_REQUEST)
        
    user = serializer.save()
    token, _ = Token.objects.get_or_create(user=user)
    
    return Response({
        "token": token.key,
        "user": UserSerializer(user).data
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"detail": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)
        
    email = serializer.validated_data["email"]
    password = serializer.validated_data["password"]
    
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"detail": "Invalid credentials."}, status=status.HTTP_400_BAD_REQUEST)
        
    authenticated_user = authenticate(username=user.username, password=password)
    
    if authenticated_user is not None:
        token, _ = Token.objects.get_or_create(user=authenticated_user)
        return Response({
            "token": token.key,
            "user": UserSerializer(authenticated_user).data
        }, status=status.HTTP_200_OK)
    else:
        return Response({"detail": "Invalid credentials."}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    return Response({"detail": "Logged out successfully."})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_view(request):
    return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})
