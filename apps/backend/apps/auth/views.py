from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from .serializers import CheckEmailSerializer, LoginSerializer, RegisterSerializer


# ==========================================
# 🔍 Step 1: Check Email Existence (Public)
# ==========================================
@api_view(["POST"])
@permission_classes([AllowAny])
def check_email(request):
    """
    Checks if an email exists in the database.
    Used by frontend to decide between LOGIN and REGISTER screens.

    Flow:
    1. Parse and validate email format.
    2. Query database for existence.
    3. Return plain boolean (True/False).
    """
    serializer = CheckEmailSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data["email"]
        exists = User.objects.filter(email=email).exists()
        return Response(exists, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# 🔑 Step 2 (Existing User): Login (Public)
# ==========================================
@api_view(["POST"])
@permission_classes([AllowAny])
def login_user(request):
    """
    Authenticates user credentials and returns a secure token.

    Flow:
    1. Validate email and password presence.
    2. Retrieve user object by email.
    3. Authenticate against password.
    4. Retrieve or create an API token.
    5. Return token + user metadata.
    """
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        try:
            user_obj = User.objects.get(email=email)
            user = authenticate(request, username=user_obj.username, password=password)
            if user is not None:
                login(request, user)
                # ✅ Get or create token for session persistence
                token, created = Token.objects.get_or_create(user=user)
                return Response({
                    "token": token.key,
                    "user": {
                        "id": user.id,
                        "username": user.username,
                        "email": user.email,
                        "fullName": f"{user.first_name} {user.last_name}".strip()
                    }
                }, status=status.HTTP_200_OK)
            else:
                # ❌ Password mismatch
                return Response({"message": "Wrong password!"}, status=status.HTTP_401_UNAUTHORIZED)
        except User.DoesNotExist:
            # ❌ Email not found
            return Response({"message": "User not found"}, status=status.HTTP_404_NOT_FOUND)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# 📝 Step 2 (New User): Register (Public)
# ==========================================
@api_view(["POST"])
@permission_classes([AllowAny])
def register_user(request):
    """
    Registers a new user and generates their initial token.

    Flow:
    1. Validate inputs (ensure email is unique).
    2. Auto-generate username and save user to database.
    3. Log user session in.
    4. Generate and return API token + user metadata.
    """
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        login(request, user)
        # ✅ Generate initial token
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "fullName": f"{user.first_name} {user.last_name}".strip()
            }
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ==========================================
# 🚪 Revoke Authentication: Logout (Protected)
# ==========================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """
    Logs out the user by deleting their database token.

    Flow:
    1. Read user object from authorization token.
    2. Delete the associated Token row in database.
    3. Return confirmation.
    """
    # ❌ Delete the token to invalidate the session
    request.user.auth_token.delete()
    return Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)


# ==========================================
# 👤 Fetch User Account: Profile (Protected)
# ==========================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_profile(request):
    """
    Retrieves information for the logged-in user.

    Flow:
    1. Read user object from token context.
    2. Return user metadata.
    """
    user = request.user
    return Response({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "fullName": f"{user.first_name} {user.last_name}".strip()
    }, status=status.HTTP_200_OK)
