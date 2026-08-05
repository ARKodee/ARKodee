from django.db import models
from django.conf import settings
import uuid


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
