import math
import random
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db import transaction, models
from django.contrib.auth.models import User

from apps.auth.models import UserStats
from apps.problems.models import Problem
from apps.problems.serializers import ProblemDetailSerializer
from .models import DuelMatch
from .serializers import DuelMatchCreateSerializer, DuelMatchHistorySerializer


@api_view(["POST"])
@permission_classes([AllowAny])  # Handled with system or socket authentication if required
def create_duel_view(request):
    serializer = DuelMatchCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    player_a = serializer.validated_data["player_a_id"]
    player_b = serializer.validated_data["player_b_id"]
    winner = serializer.validated_data.get("winner_id")
    score_a = serializer.validated_data["score_a"]
    score_b = serializer.validated_data["score_b"]
    
    stats_a, _ = UserStats.objects.get_or_create(user=player_a)
    stats_b, _ = UserStats.objects.get_or_create(user=player_b)
    
    rating_a = stats_a.duel_rating
    rating_b = stats_b.duel_rating
    
    expected_a = 1.0 / (1.0 + math.pow(10.0, (rating_b - rating_a) / 400.0))
    expected_b = 1.0 / (1.0 + math.pow(10.0, (rating_a - rating_b) / 400.0))
    
    if winner == player_a:
        actual_a = 1.0
        actual_b = 0.0
    elif winner == player_b:
        actual_a = 0.0
        actual_b = 1.0
    else:
        actual_a = 0.5
        actual_b = 0.5
        
    K = 32
    change_a = int(round(K * (actual_a - expected_a)))
    change_b = int(round(K * (actual_b - expected_b)))
    
    with transaction.atomic():
        stats_a.duel_rating = max(100, stats_a.duel_rating + change_a)
        stats_b.duel_rating = max(100, stats_b.duel_rating + change_b)
        
        if winner == player_a:
            stats_a.total_wins += 1
            stats_a.streak += 1
            stats_b.total_losses += 1
            stats_b.streak = 0
        elif winner == player_b:
            stats_b.total_wins += 1
            stats_b.streak += 1
            stats_a.total_losses += 1
            stats_a.streak = 0
        else:
            stats_a.total_draws += 1
            stats_b.total_draws += 1
            
        stats_a.save()
        stats_b.save()
        
        duel = DuelMatch.objects.create(
            player_a=player_a,
            player_b=player_b,
            winner=winner,
            score_a=score_a,
            score_b=score_b,
            elo_delta_a=change_a,
            elo_delta_b=change_b
        )
        
    return Response({
        "match_id": str(duel.id),
        "elo_delta_a": change_a,
        "elo_delta_b": change_b,
        "new_rating_a": stats_a.duel_rating,
        "new_rating_b": stats_b.duel_rating,
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def duel_history_view(request):
    matches = DuelMatch.objects.filter(
        models.Q(player_a=request.user) | models.Q(player_b=request.user)
    ).order_by("-created_at")[:10]
    
    serializer = DuelMatchHistorySerializer(matches, many=True, context={"request_user": request.user})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])  # Can be hit by the socket service or guests
def duel_problems_view(request):
    """
    Selects 4 dynamic problems for 1v1 matchmaking:
    - 1 Easy problem
    - 2 Medium problems
    - 1 Hard problem
    """
    # 1. Fetch only IDs from approved problems to avoid massive database payloads and timeouts
    easy_ids = list(Problem.objects.filter(status="approved", difficulty="easy").values_list("id", flat=True))
    medium_ids = list(Problem.objects.filter(status="approved", difficulty="medium").values_list("id", flat=True))
    hard_ids = list(Problem.objects.filter(status="approved", difficulty="hard").values_list("id", flat=True))

    selected_ids = []

    # Select 1 Easy
    if easy_ids:
        selected_ids.append(random.choice(easy_ids))
    
    # Select 2 Medium
    if len(medium_ids) >= 2:
        selected_ids.extend(random.sample(medium_ids, 2))
    elif medium_ids:
        selected_ids.extend(medium_ids)

    # Select 1 Hard
    if hard_ids:
        selected_ids.append(random.choice(hard_ids))

    # Fill up if we don't have enough problems (need exactly 4)
    if len(selected_ids) < 4:
        all_approved_ids = list(Problem.objects.filter(status="approved").values_list("id", flat=True))
        remaining_needed = 4 - len(selected_ids)
        if remaining_needed > 0 and all_approved_ids:
            # Avoid duplicates if possible
            existing_ids = set(selected_ids)
            available_extra = [pid for pid in all_approved_ids if pid not in existing_ids]
            if len(available_extra) >= remaining_needed:
                selected_ids.extend(random.sample(available_extra, remaining_needed))
            else:
                selected_ids.extend(available_extra)
                # If still short, just duplicate to reach 4
                while len(selected_ids) < 4:
                    selected_ids.append(random.choice(all_approved_ids))

    # 2. Fetch the full problem records and prefetch test cases only for the 4 selected IDs
    selected_problems = list(
        Problem.objects.filter(id__in=selected_ids).prefetch_related("test_cases")
    )

    # Order: Easy -> Medium -> Hard
    def get_difficulty_rank(p):
        if p.difficulty.lower() == "easy":
            return 1
        elif p.difficulty.lower() == "medium":
            return 2
        return 3
    selected_problems.sort(key=get_difficulty_rank)

    # Standard serialization
    serializer = ProblemDetailSerializer(selected_problems, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)
