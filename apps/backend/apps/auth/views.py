from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token


@api_view(["POST"])
@permission_classes([AllowAny])
def check_email_view(request):
    email = request.data.get("email")
    if not email:
        return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
    
    exists = User.objects.filter(email=email).exists()
    return Response({"exists": exists})


@api_view(["POST"])
@permission_classes([AllowAny])
def register_view(request):
    email = request.data.get("email")
    password = request.data.get("password")
    full_name = request.data.get("fullName", "")
    
    if not email or not password:
        return Response({"detail": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)
        
    if User.objects.filter(email=email).exists():
        return Response({"detail": "User with this email already exists."}, status=status.HTTP_400_BAD_REQUEST)
        
    # Use email as username since Django User model requires username and email is unique
    username = email
    
    # Split full name into first and last name if possible
    name_parts = full_name.split(" ", 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ""
    
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name
    )
    
    token, _ = Token.objects.get_or_create(user=user)
    
    return Response({
        "token": token.key,
        "user": {
            "email": user.email,
            "fullName": full_name or user.first_name
        }
    }, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([AllowAny])
def login_view(request):
    email = request.data.get("email")
    password = request.data.get("password")
    
    if not email or not password:
        return Response({"detail": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({"detail": "Invalid credentials."}, status=status.HTTP_400_BAD_REQUEST)
        
    authenticated_user = authenticate(username=user.username, password=password)
    
    if authenticated_user is not None:
        token, _ = Token.objects.get_or_create(user=authenticated_user)
        full_name = f"{authenticated_user.first_name} {authenticated_user.last_name}".strip()
        if not full_name:
            full_name = authenticated_user.first_name or "User"
            
        return Response({
            "token": token.key,
            "user": {
                "email": authenticated_user.email,
                "fullName": full_name
            }
        })
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
    user = request.user
    full_name = f"{user.first_name} {user.last_name}".strip()
    if not full_name:
        full_name = user.first_name or "User"
        
    return Response({
        "email": user.email,
        "fullName": full_name
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    return Response({"status": "ok"})
