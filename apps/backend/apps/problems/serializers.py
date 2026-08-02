from rest_framework import serializers
from .models import Problem, TestCase, Submission, UserProblemStats


class ProblemListSerializer(serializers.ModelSerializer):
    """
    Serializer for problem bank listing with solved/attempted status and difficulty points.
    """
    difficulty = serializers.SerializerMethodField()
    points = serializers.SerializerMethodField()
    is_solved = serializers.SerializerMethodField()
    is_attempted = serializers.SerializerMethodField()
    tags = serializers.SlugRelatedField(many=True, read_only=True, slug_field="name")

    class Meta:
        model = Problem
        fields = [
            "id",
            "slug",
            "title",
            "difficulty",
            "points",
            "is_solved",
            "is_attempted",
            "tags",
        ]

    def get_difficulty(self, obj):
        return obj.difficulty.upper()

    def get_points(self, obj):
        if obj.difficulty == "easy":
            return 100
        elif obj.difficulty == "medium":
            return 200
        return 300

    def get_is_solved(self, obj):
        user_stats = self.context.get("user_stats", {})
        return user_stats.get(obj.id) == "solved"

    def get_is_attempted(self, obj):
        user_stats = self.context.get("user_stats", {})
        return user_stats.get(obj.id) in ["attempted", "solved"]


class ProblemDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed problem view including sample inputs, outputs, and boilerplate templates.
    """
    difficulty = serializers.SerializerMethodField()
    sample_input = serializers.SerializerMethodField()
    sample_output = serializers.SerializerMethodField()
    sample_test_cases = serializers.SerializerMethodField()
    boilerplate = serializers.SerializerMethodField()

    class Meta:
        model = Problem
        fields = [
            "id",
            "slug",
            "title",
            "description",
            "difficulty",
            "constraints",
            "input_format",
            "output_format",
            "sample_input",
            "sample_output",
            "sample_test_cases",
            "time_limit_ms",
            "memory_limit_mb",
            "boilerplate",
        ]

    def get_difficulty(self, obj):
        return obj.difficulty.upper()

    def get_sample_input(self, obj):
        samples = obj.test_cases.filter(is_sample=True).order_by("order_index")
        return [s.input for s in samples]

    def get_sample_output(self, obj):
        samples = obj.test_cases.filter(is_sample=True).order_by("order_index")
        return [s.expected_output for s in samples]

    def get_sample_test_cases(self, obj):
        samples = obj.test_cases.filter(is_sample=True).order_by("order_index")
        if not samples.exists():
            samples = obj.test_cases.all().order_by("order_index")
        return [
            {
                "id": str(s.id),
                "input": s.input,
                "expected_output": s.expected_output,
                "label": f"Case {idx + 1}",
            }
            for idx, s in enumerate(samples[:3])
        ]

    def get_boilerplate(self, obj):
        return self.context.get("templates", {})


class SubmissionHistorySerializer(serializers.ModelSerializer):
    """
    Serializer for retrieving user's past submission records for a problem.
    """
    created_at = serializers.DateTimeField(source="submitted_at", format="%Y-%m-%dT%H:%M:%SZ", read_only=True)

    class Meta:
        model = Submission
        fields = [
            "id",
            "language",
            "verdict",
            "test_cases_passed",
            "total_test_cases",
            "code",
            "created_at",
        ]


class CodeExecutionRequestSerializer(serializers.Serializer):
    """
    Validates payload for Run and Submit code requests.
    """
    code = serializers.CharField(required=True, allow_blank=False)
    language = serializers.ChoiceField(
        choices=["python", "javascript", "java", "cpp"],
        default="python"
    )
