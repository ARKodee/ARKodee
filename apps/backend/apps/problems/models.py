from django.db import models
from django.conf import settings
import uuid
import datetime


class Tag(models.Model):
    """
    Stores tags for problem categorization (e.g., 'Array', 'Dynamic Programming').
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = "tags"

    def __str__(self):
        return self.name


class Problem(models.Model):
    """
    Problem bank metadata. Test cases are stored separately for efficiency.
    """
    DIFFICULTY_CHOICES = [
        ("easy", "Easy"),
        ("medium", "Medium"),
        ("hard", "Hard"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True)
    description = models.TextField()  # Markdown supported
    difficulty = models.CharField(
        max_length=10,
        choices=DIFFICULTY_CHOICES,
        default="easy"
    )
    tags = models.ManyToManyField(Tag, blank=True, related_name="problems")
    constraints = models.TextField(blank=True, null=True)
    input_format = models.TextField(blank=True, null=True)
    output_format = models.TextField(blank=True, null=True)
    sample_input = models.TextField(blank=True, null=True)
    sample_output = models.TextField(blank=True, null=True)
    time_limit_ms = models.IntegerField(default=2000)
    memory_limit_mb = models.IntegerField(default=256)
    templates = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
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
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_problems"
    )
    serial_no = models.PositiveIntegerField(unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


    class Meta:
        db_table = "problems"

    def save(self, *args, **kwargs):
        if not self.serial_no:
            max_serial = Problem.objects.aggregate(max_val=models.Max('serial_no'))['max_val']
            self.serial_no = (max_serial or 0) + 1
        super().save(*args, **kwargs)

    def __str__(self):
        return f"#{self.serial_no} - {self.title} ({self.difficulty.capitalize()})"


class TestCase(models.Model):
    """
    Holds inputs and outputs for testing solutions.
    Sample cases are visible to users; hidden cases are used for compilation verification.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    problem = models.ForeignKey(
        Problem,
        on_delete=models.CASCADE,
        related_name="test_cases"
    )
    input = models.TextField()
    expected_output = models.TextField()
    is_sample = models.BooleanField(default=False)
    order_index = models.IntegerField(default=0)

    class Meta:
        db_table = "test_cases"
        ordering = ["order_index"]

    def __str__(self):
        type_str = "Sample" if self.is_sample else "Hidden"
        return f"{type_str} TestCase #{self.order_index} for {self.problem.title}"


class Submission(models.Model):
    """
    Stores code execution and compilation history.
    """
    VERDICT_CHOICES = [
        ("AC", "Accepted"),
        ("WA", "Wrong Answer"),
        ("TLE", "Time Limit Exceeded"),
        ("MLE", "Memory Limit Exceeded"),
        ("RE", "Runtime Error"),
        ("CE", "Compile Error"),
        ("PENDING", "Pending"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submissions"
    )
    problem = models.ForeignKey(
        Problem,
        on_delete=models.CASCADE,
        related_name="submissions"
    )
    contest = models.ForeignKey(
        "contests_app.Contest",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="submissions"
    )
    language = models.CharField(max_length=20)  # e.g., 'python', 'cpp', 'java'
    code = models.TextField()
    verdict = models.CharField(
        max_length=10,
        choices=VERDICT_CHOICES,
        default="PENDING"
    )
    runtime_ms = models.IntegerField(blank=True, null=True)
    memory_used_mb = models.IntegerField(blank=True, null=True)
    test_cases_passed = models.IntegerField(default=0)
    total_test_cases = models.IntegerField(default=0)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "submissions"
        ordering = ["-submitted_at"]

    def __str__(self):
        return f"Submission {self.id} ({self.verdict}) by {self.user.username}"


class UserProblemStats(models.Model):
    """
    Junction table caching user progress per problem (Solved vs Attempted).
    Used to render checklist indicators instantly in the catalog view.
    """
    STATUS_CHOICES = [
        ("attempted", "Attempted"),
        ("solved", "Solved"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="problem_stats"
    )
    problem = models.ForeignKey(
        Problem,
        on_delete=models.CASCADE,
        related_name="user_stats"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="attempted"
    )
    attempts_count = models.IntegerField(default=0)
    last_attempted_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_problem_stats"
        unique_together = ("user", "problem")

    def __str__(self):
        return f"{self.user.username} - {self.problem.title} ({self.status.upper()})"


class ChangeRequest(models.Model):
    """
    Stores change requests (Create/Update/Delete) for Problems and Contests submitted by Moderators
    awaiting Superadmin approval.
    """
    ENTITY_CHOICES = [
        ("problem", "Problem"),
        ("contest", "Contest"),
    ]
    ACTION_CHOICES = [
        ("CREATE", "Create"),
        ("UPDATE", "Update"),
        ("DELETE", "Delete"),
    ]
    STATUS_CHOICES = [
        ("PENDING", "Pending Approval"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entity_type = models.CharField(max_length=20, choices=ENTITY_CHOICES)
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="PENDING")

    target_id = models.UUIDField(null=True, blank=True)
    title_preview = models.CharField(max_length=200)
    payload = models.JSONField(default=dict, blank=True)

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="change_requests"
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_change_requests"
    )
    rejection_reason = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "change_requests"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} {self.entity_type.upper()}: {self.title_preview} [{self.status}]"


class DailyBug(models.Model):
    """
    A daily debugging challenge. Each bug has broken starter code that the user
    must fix within a strict line-edit budget.
    """
    CATEGORY_CHOICES = [
        ("arrays", "Arrays"),
        ("strings", "Strings"),
        ("loops", "Loops"),
        ("recursion", "Recursion"),
        ("sorting", "Sorting"),
        ("math", "Math"),
        ("logic", "Logic"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default="other")
    description = models.TextField()

    # The broken code the user starts with, keyed by language
    starter_codes = models.JSONField(
        default=dict,
        help_text='{"python": "def solve():\\n    pass", "javascript": "...", "cpp": "..."}'
    )

    # Hidden test cases for full submission stored as JSON list of {input, expected_output}
    test_cases_json = models.JSONField(default=list, blank=True)

    # Visible example cases for the problem description: [{input, output, explanation}]
    examples = models.JSONField(default=list, blank=True)

    # A brief one-line sample for the dashboard card
    sample_input = models.TextField(blank=True, default="")
    expected_output = models.TextField(blank=True, default="")

    line_budget = models.PositiveIntegerField(
        default=3,
        help_text="Max number of lines the user is allowed to modify."
    )
    xp_reward = models.PositiveIntegerField(default=100)
    time_limit_ms = models.IntegerField(default=2000)

    # Which calendar date this bug is active for
    date = models.DateField(unique=True, default=datetime.date.today)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "daily_bugs"
        ordering = ["-date"]

    def __str__(self):
        return f"[{self.date}] {self.title}"


class UserBugSolve(models.Model):
    """
    Records when a user successfully solves a DailyBug.
    Used for the dashboard is_solved flag and streak calculations.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bug_solves",
    )
    bug = models.ForeignKey(
        DailyBug,
        on_delete=models.CASCADE,
        related_name="solves",
    )
    solved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_bug_solves"
        unique_together = ("user", "bug")

    def __str__(self):
        return f"{self.user.username} solved [{self.bug.date}] {self.bug.title}"




