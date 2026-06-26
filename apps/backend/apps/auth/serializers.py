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
    email = serializers.EmailField()


# ==========================================
# 2. Login Serializer (Public Flow)
# ==========================================
class LoginSerializer(serializers.Serializer):
    """
    Validates credentials for user login.
    Expects: { "email": "user@example.com", "password": "securepassword" }
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


# ==========================================
# 3. Register Serializer (Public Flow)
# ==========================================
class RegisterSerializer(serializers.Serializer):
    """
    Validates sign-up details and registers a new User in the DB.
    Expects: { "email": "user@example.com", "password": "...", "fullName": "..." }
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    fullName = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        # ❌ Validate if email already exists in the system
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        email = validated_data["email"]
        password = validated_data["password"]
        full_name = validated_data.get("fullName", "")

        # ⚙️ Auto-generate a unique username (Django requirement)
        username = email.replace("@", "_").replace(".", "_")
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1

        # ⚙️ Split Full Name into First and Last Name
        name_parts = full_name.strip().split(" ", 1)
        first_name = name_parts[0]
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
