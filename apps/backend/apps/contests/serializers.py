from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Contest, ContestProblem, ContestParticipant

User = get_user_model()


class ContestProblemSerializer(serializers.ModelSerializer):
    """
    Serializes problems assigned to a specific contest with problem letter index ("A", "B") and points.
    """
    id = serializers.CharField(source="problem.id", read_only=True)
    slug = serializers.CharField(source="problem.slug", read_only=True)
    title = serializers.CharField(source="problem.title", read_only=True)
    difficulty = serializers.SerializerMethodField()

    class Meta:
        model = ContestProblem
        fields = ["id", "slug", "title", "difficulty", "points", "order_index"]

    def get_difficulty(self, obj):
        return obj.problem.difficulty.upper() if obj.problem else "MEDIUM"


class ContestListSerializer(serializers.ModelSerializer):
    """
    Serializes contest cards for the dashboard.
    """
    status_label = serializers.SerializerMethodField()
    is_registered = serializers.SerializerMethodField()
    problem_count = serializers.SerializerMethodField()
    access_code_required = serializers.SerializerMethodField()

    class Meta:
        model = Contest
        fields = [
            "id",
            "slug",
            "title",
            "description",
            "type",
            "scoring_mode",
            "start_time",
            "end_time",
            "is_rated",
            "status_label",
            "is_registered",
            "problem_count",
            "access_code_required",
        ]

    def get_status_label(self, obj):
        now = timezone.now()
        if now < obj.start_time:
            return "upcoming"
        elif obj.start_time <= now <= obj.end_time:
            return "live"
        return "past"

    def get_is_registered(self, obj):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            return ContestParticipant.objects.filter(contest=obj, user=request.user).exists()
        return False

    def get_problem_count(self, obj):
        return obj.contest_problems.count()

    def get_access_code_required(self, obj):
        return bool(obj.access_code and obj.access_code.strip())


class ContestDetailSerializer(serializers.ModelSerializer):
    """
    Serializes detailed contest specs, assigned problem array, and server clock timestamp.
    """
    status_label = serializers.SerializerMethodField()
    is_registered = serializers.SerializerMethodField()
    problems = serializers.SerializerMethodField()
    server_time = serializers.SerializerMethodField()
    access_code_required = serializers.SerializerMethodField()

    class Meta:
        model = Contest
        fields = [
            "id",
            "slug",
            "title",
            "description",
            "type",
            "scoring_mode",
            "start_time",
            "end_time",
            "is_rated",
            "eligible_class_tier",
            "access_code_required",
            "status_label",
            "is_registered",
            "problems",
            "server_time",
        ]

    def get_access_code_required(self, obj):
        return bool(obj.access_code and obj.access_code.strip())

    def get_status_label(self, obj):
        now = timezone.now()
        if now < obj.start_time:
            return "upcoming"
        elif obj.start_time <= now <= obj.end_time:
            return "live"
        return "past"

    def get_is_registered(self, obj):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            return ContestParticipant.objects.filter(contest=obj, user=request.user).exists()
        return False

    def get_problems(self, obj):
        now = timezone.now()
        # Strictly hide problem lists if contest has not started yet (Security Leak Prevention)
        if now < obj.start_time:
            return []
        problems = obj.contest_problems.all().order_by("order_index")
        return ContestProblemSerializer(problems, many=True).data

    def get_server_time(self, obj):
        return timezone.now().strftime("%Y-%m-%dT%H:%M:%SZ")


class ContestRegisterSerializer(serializers.Serializer):
    """
    Validates user contest registration and optional PIN access code.
    """
    access_code = serializers.CharField(required=False, allow_blank=True)


class GlobalLeaderboardEntrySerializer(serializers.Serializer):
    """
    Serializes top competitive platform ranks.
    """
    rank = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.CharField()
    elo_rating = serializers.IntegerField()
