from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import Contest, ContestParticipant
from .serializers import (
    ContestListSerializer,
    ContestDetailSerializer,
    ContestRegisterSerializer,
    GlobalLeaderboardEntrySerializer,
)
from .utils import calculate_contest_leaderboard, finalize_contest_and_calculate_elo

User = get_user_model()


def get_contest_by_identifier(identifier):
    """
    Robust lookup helper that resolves a Contest by either its UUID id or slug string.
    """
    queryset = Contest.objects.filter(status="approved")
    # Try as UUID
    try:
        return queryset.get(id=identifier)
    except (ValidationError, Contest.DoesNotExist, ValueError):
        pass
    # Try as slug
    return get_object_or_404(queryset, slug=identifier)


@api_view(["GET"])
@permission_classes([AllowAny])
def contests_list_view(request):
    """
    List contests filtered by time status: all, live, upcoming, or past.
    """
    filter_type = request.query_params.get("filter", "all").strip().lower()
    now = timezone.now()
    
    queryset = Contest.objects.filter(status="approved").order_by("-start_time")
    
    if filter_type == "live":
        queryset = queryset.filter(start_time__lte=now, end_time__gte=now)
    elif filter_type == "upcoming":
        queryset = queryset.filter(start_time__gt=now).order_by("-start_time")
    elif filter_type == "past":
        queryset = queryset.filter(end_time__lt=now).order_by("-end_time")
        
    serializer = ContestListSerializer(queryset, many=True, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def contest_detail_view(request, slug):
    """
    Retrieve full specs, problem array, access requirements, and server clock timestamp.
    """
    contest = get_contest_by_identifier(slug)
    serializer = ContestDetailSerializer(contest, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def contest_register_view(request, slug):
    """
    Register user for a contest (validating optional PIN access code for private contests).
    """
    contest = get_contest_by_identifier(slug)
    
    reg_serializer = ContestRegisterSerializer(data=request.data)
    if not reg_serializer.is_valid():
        return Response(reg_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    # Check PIN access code if contest is private
    if contest.access_code and contest.access_code.strip():
        provided_code = reg_serializer.validated_data.get("access_code", "").strip()
        if provided_code != contest.access_code.strip():
            return Response({"detail": "Invalid access PIN code for this contest."}, status=status.HTTP_400_BAD_REQUEST)
            
    # Register participant
    participant, created = ContestParticipant.objects.get_or_create(
        contest=contest,
        user=request.user
    )
    
    return Response({
        "detail": "Successfully registered for contest.",
        "is_registered": True
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def contest_start_virtual_view(request, slug):
    """
    Starts a virtual practice match session for an ended contest (0 ELO impact).
    """
    contest = get_contest_by_identifier(slug)
    now = timezone.now()
    
    # Gate to ended contests only
    if now < contest.end_time:
        return Response(
            {"detail": "Virtual practice mode is only available for ended contests."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    participant, created = ContestParticipant.objects.get_or_create(
        contest=contest,
        user=request.user
    )
    
    return Response({
        "detail": "Virtual contest session started.",
        "virtual_session_id": str(participant.id),
        "is_virtual": True
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def contest_leaderboard_view(request, slug):
    """
    Returns official finalized standings. Standings are published ONLY after the contest has ended.
    On first fetch after the contest ends, standings and ELO changes are computed and saved to the DB.
    """
    contest = get_contest_by_identifier(slug)
    now = timezone.now()
    
    # Gate standings: reveal only after contest ends
    if now < contest.end_time:
        return Response(
            {"detail": "Leaderboard standings are published only after the contest has ended."},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    # Auto-finalize ELO rating changes and save participant standings to DB on first access
    if not contest.is_finalized:
        try:
            finalize_contest_and_calculate_elo(contest)
        except Exception as e:
            # Fallback/Log, do not crash if ELO fails
            print(f"ELO calculation failed: {e}")
            
    standings = calculate_contest_leaderboard(contest)
    return Response(standings, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def global_leaderboard_view(request):
    """
    Returns top platform accounts for sidebar display based on contest rating.
    """
    limit = request.query_params.get("limit", 10)
    try:
        limit = int(limit)
    except ValueError:
        limit = 10
        
    from apps.auth.models import UserStats
    from .utils import get_rating_badge_info
    stats_list = UserStats.objects.select_related("user").filter(user__is_active=True).order_by("-contest_rating")[:limit]
    
    results = []
    for idx, stat in enumerate(stats_list):
        badge_info = get_rating_badge_info(stat.contest_rating)
        results.append({
            "rank": idx + 1,
            "username": stat.user.username,
            "email": stat.user.email,
            "elo_rating": stat.contest_rating,
            "contest_rating": stat.contest_rating,
            "badge_title": badge_info["badge_title"],
            "badge_color_class": badge_info["badge_color_class"],
        })
        
    return Response(results, status=status.HTTP_200_OK)
