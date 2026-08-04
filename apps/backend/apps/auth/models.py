from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
import uuid


class UserStats(models.Model):
    """
    Tracks gamified competitive statistics for a user.
    Linked One-to-One with Django's built-in User model.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="stats"
    )
    contest_rating = models.IntegerField(default=1200)
    duel_rating = models.IntegerField(default=1200)
    ROLE_CHOICES = [
        ("competitor", "Competitor"),
        ("moderator", "Moderator / Problem Setter"),
        ("superadmin", "Superadmin"),
    ]
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="competitor"
    )
    total_wins = models.IntegerField(default=0)
    total_losses = models.IntegerField(default=0)
    total_draws = models.IntegerField(default=0)
    streak = models.IntegerField(default=0)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Stats"
        verbose_name_plural = "User Stats"
        db_table = "user_stats"

    def __str__(self):
        return f"{self.user.username}'s Stats (Contest ELO: {self.contest_rating}, Duel ELO: {self.duel_rating})"


# ==========================================
# 🔌 Django Signals (Automated Profile Seeding)
# ==========================================
@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_stats(sender, instance, created, **kwargs):
    """
    Automatically creates a corresponding UserStats record 
    whenever a new Django User is created (via signup, admin panel, or CLI).
    """
    if created:
        UserStats.objects.create(user=instance)


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def save_user_stats(sender, instance, **kwargs):
    """
    Saves the UserStats record whenever the User object is saved.
    """
    if hasattr(instance, "stats"):
        instance.stats.save()


class DuelMatch(models.Model):
    """
    Stores historical 1v1 matchmaking duel outcomes and ELO rating adjustments.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    player_a = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="matches_as_host"
    )
    player_b = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="matches_as_guest"
    )
    winner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="won_duels"
    )
    score_a = models.IntegerField(default=0)
    score_b = models.IntegerField(default=0)
    elo_delta_a = models.IntegerField(default=0)
    elo_delta_b = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "duel_matches"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Duel {self.id}: {self.player_a.username} vs {self.player_b.username}"

