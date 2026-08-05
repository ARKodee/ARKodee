from rest_framework import serializers
from django.contrib.auth.models import User


# ==========================================
# 1. Check Email Serializer (Public Flow)
# ==========================================
class CheckEmailSerializer(serializers.Serializer):
    """
    Validates request body for progressive discovery check.
    Expects: { "email": "user@example.com" }
    """
    email = serializers.EmailField(required=True)


# ==========================================
# 2. Login Serializer (Public Flow)
# ==========================================
class LoginSerializer(serializers.Serializer):
    """
    Validates credentials for user login.
    Expects: { "email": "user@example.com", "password": "securepassword" }
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)


# ==========================================
# 3. Register Serializer (Public Flow)
# ==========================================
class RegisterSerializer(serializers.Serializer):
    """
    Validates sign-up details and registers a new User in the DB.
    Expects: { "email": "user@example.com", "password": "...", "fullName": "..." }
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)
    fullName = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        # ❌ Validate if email already exists in the system
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("User with this email already exists.")
        return value

    def create(self, validated_data):
        email = validated_data["email"]
        password = validated_data["password"]
        full_name = validated_data.get("fullName", "")

        # Generate a clean, unique username from the email prefix
        base_username = email.split("@")[0]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1

        # ⚙️ Split Full Name into First and Last Name
        name_parts = full_name.strip().split(" ", 1) if full_name else []
        first_name = name_parts[0] if len(name_parts) > 0 else ""
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        # 💾 Create and save the new User
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )
        return user


# ==========================================
# 4. Google Login Serializer (Public Flow)
# ==========================================
class GoogleLoginSerializer(serializers.Serializer):
    """
    Validates Google Sign-In payload.
    Expects: { "id_token": "<google-id-token>" }
    """
    id_token = serializers.CharField(required=True, allow_blank=False)


# ==========================================
# 4. User Serializer (Public & Protected Flow)
# ==========================================
class UserSerializer(serializers.ModelSerializer):
    """
    Serializes basic user metadata for API responses.
    """
    fullName = serializers.SerializerMethodField()
    firstName = serializers.CharField(source="first_name", read_only=True)
    lastName = serializers.CharField(source="last_name", read_only=True)
    duelRating = serializers.SerializerMethodField()
    contestRating = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "fullName", "firstName", "lastName", "duelRating", "contestRating"]

    def get_fullName(self, obj):
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name if full_name else (obj.first_name or "User")

    def get_duelRating(self, obj):
        if hasattr(obj, "stats"):
            return obj.stats.duel_rating
        return 1200

    def get_contestRating(self, obj):
        if hasattr(obj, "stats"):
            return obj.stats.contest_rating
        return 1200







