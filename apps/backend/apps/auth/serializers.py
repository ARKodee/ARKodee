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




from .models import DuelMatch

class DuelMatchCreateSerializer(serializers.Serializer):
    player_a_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    player_b_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    winner_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False, allow_null=True)
    score_a = serializers.IntegerField(default=0)
    score_b = serializers.IntegerField(default=0)


class DuelMatchHistorySerializer(serializers.ModelSerializer):
    opponent_name = serializers.SerializerMethodField()
    result = serializers.SerializerMethodField()
    elo_delta = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()

    class Meta:
        model = DuelMatch
        fields = ["id", "opponent_name", "result", "elo_delta", "date"]

    def get_opponent_name(self, obj):
        request_user = self.context.get("request_user")
        if not request_user:
            return obj.player_b.username
        return obj.player_b.username if obj.player_a == request_user else obj.player_a.username

    def get_result(self, obj):
        request_user = self.context.get("request_user")
        if not request_user:
            return "Draw"
        if not obj.winner:
            return "Draw"
        return "Victory" if obj.winner == request_user else "Defeat"

    def get_elo_delta(self, obj):
        request_user = self.context.get("request_user")
        if not request_user:
            return "+0 ELO"
        delta = obj.elo_delta_a if obj.player_a == request_user else obj.elo_delta_b
        return f"+{delta} ELO" if delta >= 0 else f"{delta} ELO"

    def get_date(self, obj):
        return obj.created_at.strftime("%Y-%m-%d")

