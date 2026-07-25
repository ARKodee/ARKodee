from django.db import models
from django.conf import settings
import uuid


class Contest(models.Model):
    """
    Stores contest timing and metadata definitions.
    """
    TYPE_CHOICES = [
        ("public", "Public"),
        ("private", "Private"),
        ("classroom", "Classroom"),
    ]

    SCORING_CHOICES = [
        ("leetcode", "LeetCode (Virtual Score)"),
        ("codeforces", "Codeforces (Time-based Penalty)"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField(blank=True, null=True)
    type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES,
        default="public"
    )
    scoring_mode = models.CharField(
        max_length=20,
        choices=SCORING_CHOICES,
        default="leetcode"
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    access_code = models.CharField(max_length=20, blank=True, null=True)
    is_rated = models.BooleanField(default=True)
    
    CLASS_TIER_CHOICES = [
        ("class_1", "Class 1 (Advanced: ELO 1800+)"),
        ("class_2", "Class 2 (Intermediate: ELO 1400-1799)"),
        ("class_3", "Class 3 (Beginner: ELO < 1400)"),
        ("all", "All Tiers / Open"),
    ]
    eligible_class_tier = models.CharField(
        max_length=20,
        choices=CLASS_TIER_CHOICES,
        default="all"
    )

    STATUS_CHOICES = [
        ("pending", "Pending Approval"),
        ("approved", "Approved / Published"),
        ("rejected", "Rejected"),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    is_finalized = models.BooleanField(default=False)


    class Meta:
        db_table = "contests"

    def __str__(self):
        return f"{self.title} ({self.type.capitalize()})"


class ContestProblem(models.Model):
    """
    Junction table mapping problems to contests.
    Allows assigning custom points and orders per contest.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contest = models.ForeignKey(
        Contest,
        on_delete=models.CASCADE,
        related_name="contest_problems"
    )
    problem = models.ForeignKey(
        "problems_app.Problem",
        on_delete=models.CASCADE,
        related_name="contest_problems"
    )
    points = models.IntegerField(default=100)
    order_index = models.IntegerField(default=0)

    class Meta:
        db_table = "contest_problems"
        ordering = ["order_index"]
        unique_together = ("contest", "problem")

    def __str__(self):
        return f"{self.problem.title} in {self.contest.title}"


class ContestParticipant(models.Model):
    """
    Tracks users who registered/joined a contest, and their rankings.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contest = models.ForeignKey(
        Contest,
        on_delete=models.CASCADE,
        related_name="participants"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="contests_joined"
    )
    rank = models.IntegerField(blank=True, null=True)
    total_score = models.IntegerField(default=0)
    penalty_minutes = models.IntegerField(default=0)
    elo_change = models.IntegerField(blank=True, null=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "contest_participants"
        unique_together = ("contest", "user")

    def __str__(self):
        return f"{self.user.username} in {self.contest.title}"
