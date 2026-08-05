from rest_framework import serializers
from django.contrib.auth.models import User
from apps.auth.models import UserStats


# ==========================================
# 0. User Stats Serializer
# ==========================================
class UserStatsSerializer(serializers.ModelSerializer):
    """
    Serializes gamified user statistics including ELO ratings and achievements.
    """
    class Meta:
        model = UserStats
        fields = [
            'contest_rating', 'duel_rating', 'role',
            'total_wins', 'total_losses', 'total_draws',
            'streak', 'avatar_url', 'created_at', 'updated_at'
        ]


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

        # Use email as username since Django User model requires username and email is unique
        username = email

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
# 5. User Serializer (Public & Protected Flow)
# ==========================================
class UserSerializer(serializers.ModelSerializer):
    """
    Serializes basic user metadata for API responses.
    """
    fullName = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "fullName"]

    def get_fullName(self, obj):
        full_name = f"{obj.first_name} {obj.last_name}".strip()
        return full_name if full_name else (obj.first_name or "User")


# ==========================================
# 6. Profile Update Serializer (Protected Flow)
# ==========================================
class ProfileUpdateSerializer(serializers.Serializer):
    """
    Validates profile updates for the authenticated user.
    Expects any subset of: { "fullName": "...", "avatar_url": "https://..." }
    """
    fullName = serializers.CharField(required=False, allow_blank=True)
    avatar_url = serializers.URLField(required=False, allow_blank=True, allow_null=True)

    def update(self, instance, validated_data):
        full_name = validated_data.get("fullName")
        avatar_url = validated_data.get("avatar_url", serializers.empty)

        if full_name is not None:
            cleaned_name = full_name.strip()
            if cleaned_name:
                name_parts = cleaned_name.split(" ", 1)
                instance.first_name = name_parts[0]
                instance.last_name = name_parts[1] if len(name_parts) > 1 else ""

        if avatar_url is not serializers.empty:
            stats, _ = UserStats.objects.get_or_create(user=instance)
            stats.avatar_url = avatar_url or None
            stats.save(update_fields=["avatar_url", "updated_at"])

        instance.save()
        return instance


# ==========================================
# 7. Profile Stats Serializer (Protected Flow)
# ==========================================
class ProfileStatsSerializer(serializers.Serializer):
    """
    Comprehensive profile response with user info, stats, and activity.
    Combines data from multiple sources into a single response.
    """
    user = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()
    problem_stats = serializers.SerializerMethodField()
    activity = serializers.SerializerMethodField()
    contest_stats = serializers.SerializerMethodField()
    language_stats = serializers.SerializerMethodField()
    tag_stats = serializers.SerializerMethodField()
    earned_badges = serializers.SerializerMethodField()

    class Meta:
        fields = [
            'user', 'stats', 'problem_stats', 'activity',
            'contest_stats', 'language_stats', 'tag_stats', 'earned_badges'
        ]

    def get_user(self, obj):
        """Return basic user information."""
        return UserSerializer(obj).data

    def get_stats(self, obj):
        """Return the user's competitive stats, creating them if needed."""
        stats, _ = UserStats.objects.get_or_create(user=obj)
        return UserStatsSerializer(stats).data

    def get_problem_stats(self, obj):
        """Return aggregated problem statistics."""
        from apps.auth.utils import get_user_problem_stats
        return get_user_problem_stats(obj)

    def get_activity(self, obj):
        """Return recent activity."""
        from apps.auth.utils import get_user_recent_activity
        return get_user_recent_activity(obj, limit=5)

    def get_contest_stats(self, obj):
        """Return contest performance statistics."""
        from apps.auth.utils import get_contest_stats
        return get_contest_stats(obj)

    def get_language_stats(self, obj):
        """Return language usage statistics."""
        from apps.auth.utils import get_user_language_stats
        return get_user_language_stats(obj)

    def get_tag_stats(self, obj):
        """Return problem tag statistics."""
        from apps.auth.utils import get_user_tag_stats
        return get_user_tag_stats(obj)

    def get_earned_badges(self, obj):
        """Return a compact, derived badge list for the profile UI."""
        stats, _ = UserStats.objects.get_or_create(user=obj)
        problem_stats = self.get_problem_stats(obj)
        contest_stats = self.get_contest_stats(obj)

        badges = [
            {
                "key": "role",
                "title": stats.get_role_display(),
                "shortTitle": "CMP",
                "description": "Current access level",
                "variant": "accent",
            },
            {
                "key": "rating",
                "title": self._get_rating_title(stats.contest_rating),
                "shortTitle": "RANK",
                "description": f"Contest rating {stats.contest_rating}",
                "variant": "warning",
            },
        ]

        if stats.streak > 0:
            badges.append({
                "key": "streak",
                "title": f"{stats.streak}-Day Streak",
                "shortTitle": "STRK",
                "description": "Active solving streak",
                "variant": "success",
            })

        if problem_stats["total_solved"] > 0:
            badges.append({
                "key": "solver",
                "title": "Problem Solver",
                "shortTitle": "SOLV",
                "description": f"{problem_stats['total_solved']} solved problems",
                "variant": "info",
            })

        if contest_stats["total_contests"] > 0:
            badges.append({
                "key": "contestant",
                "title": "Contest Competitor",
                "shortTitle": "CNT",
                "description": f"{contest_stats['total_contests']} contests joined",
                "variant": "default",
            })

        return badges[:5]

    def _get_rating_title(self, rating):
        if rating >= 2100:
            return "Grandmaster"
        if rating >= 1900:
            return "Master"
        if rating >= 1600:
            return "Expert"
        if rating >= 1400:
            return "Specialist"
        if rating >= 1200:
            return "Pupil"
        return "Newbie"
