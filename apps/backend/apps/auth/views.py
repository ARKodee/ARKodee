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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile_view(request):
    return Response(UserSerializer(request.user).data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})


import math
from django.db import transaction
from django.db import models
from .models import UserStats, DuelMatch
from .serializers import DuelMatchCreateSerializer, DuelMatchHistorySerializer

@api_view(["POST"])
@permission_classes([AllowAny])
def create_duel_view(request):
    serializer = DuelMatchCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    player_a = serializer.validated_data["player_a_id"]
    player_b = serializer.validated_data["player_b_id"]
    winner = serializer.validated_data.get("winner_id")
    score_a = serializer.validated_data["score_a"]
    score_b = serializer.validated_data["score_b"]
    
    stats_a, _ = UserStats.objects.get_or_create(user=player_a)
    stats_b, _ = UserStats.objects.get_or_create(user=player_b)
    
    rating_a = stats_a.duel_rating
    rating_b = stats_b.duel_rating
    
    expected_a = 1.0 / (1.0 + math.pow(10.0, (rating_b - rating_a) / 400.0))
    expected_b = 1.0 / (1.0 + math.pow(10.0, (rating_a - rating_b) / 400.0))
    
    if winner == player_a:
        actual_a = 1.0
        actual_b = 0.0
    elif winner == player_b:
        actual_a = 0.0
        actual_b = 1.0
    else:
        actual_a = 0.5
        actual_b = 0.5
        
    K = 32
    change_a = int(round(K * (actual_a - expected_a)))
    change_b = int(round(K * (actual_b - expected_b)))
    
    with transaction.atomic():
        stats_a.duel_rating = max(100, stats_a.duel_rating + change_a)
        stats_b.duel_rating = max(100, stats_b.duel_rating + change_b)
        
        if winner == player_a:
            stats_a.total_wins += 1
            stats_a.streak += 1
            stats_b.total_losses += 1
            stats_b.streak = 0
        elif winner == player_b:
            stats_b.total_wins += 1
            stats_b.streak += 1
            stats_a.total_losses += 1
            stats_a.streak = 0
        else:
            stats_a.total_draws += 1
            stats_b.total_draws += 1
            
        stats_a.save()
        stats_b.save()
        
        duel = DuelMatch.objects.create(
            player_a=player_a,
            player_b=player_b,
            winner=winner,
            score_a=score_a,
            score_b=score_b,
            elo_delta_a=change_a,
            elo_delta_b=change_b
        )
        
    return Response({
        "match_id": str(duel.id),
        "elo_delta_a": change_a,
        "elo_delta_b": change_b,
        "new_rating_a": stats_a.duel_rating,
        "new_rating_b": stats_b.duel_rating,
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def duel_history_view(request):
    matches = DuelMatch.objects.filter(
        models.Q(player_a=request.user) | models.Q(player_b=request.user)
    ).order_by("-created_at")[:10]
    
    serializer = DuelMatchHistorySerializer(matches, many=True, context={"request_user": request.user})
    return Response(serializer.data, status=status.HTTP_200_OK)

