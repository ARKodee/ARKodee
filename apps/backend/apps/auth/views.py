from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from google.auth.exceptions import GoogleAuthError

from .serializers import (
    CheckEmailSerializer,
    GoogleLoginSerializer,
    LoginSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    UserSerializer,
    ProfileStatsSerializer,
)
from .models import UserStats


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
@permission_classes([AllowAny])
def google_login_view(request):
    serializer = GoogleLoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"detail": "Google id_token is required."}, status=status.HTTP_400_BAD_REQUEST)

    client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "")
    if not client_id:
        return Response({"detail": "Google authentication is not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    raw_id_token = serializer.validated_data["id_token"]

    try:
        # Verify the token directly with Google's servers to ensure it wasn't forged
        id_info = id_token.verify_oauth2_token(
            raw_id_token,
            google_requests.Request(),
            client_id,
        )
    except (ValueError, GoogleAuthError):
        return Response({"detail": "Invalid Google token."}, status=status.HTTP_400_BAD_REQUEST)

    email = id_info.get("email")
    email_verified = id_info.get("email_verified", False)
    full_name = id_info.get("name", "").strip()

    if not email or not email_verified:
        return Response({"detail": "Google account email is unavailable or not verified."}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email=email).first()

    if user is None:
        # Create a new user account if they've never logged in with Google before
        user = User(
            username=email,
            email=email,
        )

        if full_name:
            name_parts = full_name.split(" ", 1)
            user.first_name = name_parts[0]
            user.last_name = name_parts[1] if len(name_parts) > 1 else ""

        # Google-created accounts can later set a password via a dedicated flow.
        user.set_unusable_password()
        user.save()

    token, _ = Token.objects.get_or_create(user=user)

    return Response(
        {
            "token": token.key,
            "user": UserSerializer(user).data,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    return Response({"detail": "Logged out successfully."})


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def profile_view(request):
    if request.method == "PATCH":
        serializer = ProfileUpdateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"detail": "Invalid profile data.", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        serializer.update(request.user, serializer.validated_data)
        UserStats.objects.get_or_create(user=request.user)
        return Response(ProfileStatsSerializer(request.user).data, status=status.HTTP_200_OK)

    return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_stats_view(request):
    """
    Comprehensive profile endpoint with user stats, problem analytics, and activity.
    
    Returns:
        - User basic info (id, email, fullName)
        - UserStats (ELO ratings, wins/losses, streak, role)
        - Problem stats by difficulty
        - Recent activity (submissions, contests)
        - Contest performance metrics
        - Language usage statistics
        - Problem tag statistics
    """
    UserStats.objects.get_or_create(user=request.user)
    serializer = ProfileStatsSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})
