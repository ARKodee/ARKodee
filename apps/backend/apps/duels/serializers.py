from rest_framework import serializers
from django.contrib.auth.models import User
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
