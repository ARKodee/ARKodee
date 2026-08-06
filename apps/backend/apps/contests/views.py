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
    stats_list = UserStats.objects.select_related("user").filter(
        user__is_active=True,
        user__is_staff=False,
        user__is_superuser=False
    ).order_by("-contest_rating")[:limit]
    
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


# ═══════════════════════════════════════════════════════════════════════════════
# MODERATOR CONTEST CRUD VIEWS
# All views below require is_staff or is_superuser.
# ═══════════════════════════════════════════════════════════════════════════════

def _require_moderator(request):
    if not (request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser)):
        return Response({"detail": "Moderator access required."}, status=status.HTTP_403_FORBIDDEN)
    return None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mod_contests_list(request):
    """
    Moderator endpoint: return ALL contests with search, status filter,
    assigned problem count, and registered participant count.
    """
    denied = _require_moderator(request)
    if denied:
        return denied

    from django.db.models import Count as DjCount
    from django.db.models import Q

    search_query = request.query_params.get("search", "").strip()
    status_query = request.query_params.get("status", "").strip().lower()

    contests = (
        Contest.objects
        .annotate(
            problem_count=DjCount("contest_problems", distinct=True),
            participant_count=DjCount("participants", distinct=True),
        )
        .order_by("-start_time")
    )

    if search_query:
        contests = contests.filter(
            Q(title__icontains=search_query) | Q(description__icontains=search_query)
        )

    now = timezone.now()
    if status_query == "live":
        contests = contests.filter(start_time__lte=now, end_time__gte=now)
    elif status_query == "upcoming":
        contests = contests.filter(start_time__gt=now)
    elif status_query == "ended":
        contests = contests.filter(end_time__lt=now)
    elif status_query and status_query != "all":
        contests = contests.filter(status=status_query)

    data = []
    for c in contests:
        # Determine live state
        if c.start_time <= now <= c.end_time:
            computed_status = "live"
        elif now < c.start_time:
            computed_status = "upcoming"
        else:
            computed_status = "ended"

        data.append({
            "id": str(c.id),
            "slug": c.slug,
            "title": c.title,
            "type": c.type,
            "scoring_mode": c.scoring_mode,
            "status": c.status,
            "computed_status": computed_status,
            "start_time": c.start_time.isoformat(),
            "end_time": c.end_time.isoformat(),
            "access_code": c.access_code or "",
            "is_rated": c.is_rated,
            "problem_count": c.problem_count,
            "participant_count": c.participant_count,
            "created_at": c.created_at.isoformat(),
        })

    return Response(data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mod_contest_detail(request, contest_id):
    """
    Moderator endpoint: return full contest detail including assigned problem list.
    """
    denied = _require_moderator(request)
    if denied:
        return denied

    contest = get_object_or_404(Contest, id=contest_id)
    contest_problems = contest.contest_problems.select_related("problem").order_by("order_index")

    problems_data = [
        {
            "id": str(cp.problem.id),
            "title": cp.problem.title,
            "slug": cp.problem.slug,
            "difficulty": cp.problem.difficulty.upper(),
            "points": cp.points,
            "order_index": cp.order_index,
        }
        for cp in contest_problems
    ]

    return Response({
        "id": str(contest.id),
        "slug": contest.slug,
        "title": contest.title,
        "description": contest.description or "",
        "type": contest.type,
        "scoring_mode": contest.scoring_mode,
        "start_time": contest.start_time.isoformat(),
        "end_time": contest.end_time.isoformat(),
        "access_code": contest.access_code or "",
        "is_rated": contest.is_rated,
        "eligible_class_tier": contest.eligible_class_tier,
        "status": contest.status,
        "problems": problems_data,
    }, status=status.HTTP_200_OK)


from django.utils.text import slugify

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mod_contest_create(request):
    """
    Moderator endpoint: create/schedule a new contest with assigned problems.
    If requested by Moderator (is_staff), creates a PENDING ChangeRequest for Superadmin approval.
    If requested by Superadmin (is_superuser), executes directly.
    """
    denied = _require_moderator(request)
    if denied:
        return denied

    data = request.data
    title = data.get("title", "").strip()
    if not title:
        return Response({"detail": "Title is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not data.get("start_time") or not data.get("end_time"):
        return Response({"detail": "Start time and End time are required."}, status=status.HTTP_400_BAD_REQUEST)

    # If user is NOT superuser, route to ChangeRequest approval queue
    if not request.user.is_superuser:
        from apps.problems.models import ChangeRequest
        cr = ChangeRequest.objects.create(
            entity_type="contest",
            action="CREATE",
            status="PENDING",
            title_preview=title,
            payload=data,
            requested_by=request.user,
        )
        return Response({
            "detail": "Contest creation request submitted for Superadmin approval.",
            "pending": True,
            "request_id": str(cr.id),
        }, status=status.HTTP_202_ACCEPTED)

    # ── Superadmin Direct Execution ───────────────────────────────────────────
    base_slug = slugify(title)
    slug = base_slug
    counter = 1
    while Contest.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1

    contest = Contest.objects.create(
        title=title,
        slug=slug,
        description=data.get("description", "").strip(),
        type=data.get("type", "public"),
        scoring_mode=data.get("scoring_mode", "leetcode"),
        start_time=data.get("start_time"),
        end_time=data.get("end_time"),
        access_code=data.get("access_code", "").strip() or None,
        is_rated=bool(data.get("is_rated", True)),
        eligible_class_tier=data.get("eligible_class_tier", "all"),
        status=data.get("status", "approved"),
    )

    problems_payload = data.get("problems", [])
    from apps.problems.models import Problem
    from .models import ContestProblem

    for idx, item in enumerate(problems_payload):
        prob_id = item.get("id") if isinstance(item, dict) else item
        points = item.get("points", 100) if isinstance(item, dict) else 100
        prob = Problem.objects.filter(id=prob_id).first()
        if prob:
            ContestProblem.objects.create(
                contest=contest,
                problem=prob,
                points=points,
                order_index=idx,
            )

    return Response({"detail": "Contest created.", "id": str(contest.id), "slug": contest.slug}, status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def mod_contest_update(request, contest_id):
    """
    Moderator endpoint: update contest fields and assigned problems.
    """
    denied = _require_moderator(request)
    if denied:
        return denied

    contest = get_object_or_404(Contest, id=contest_id)
    data = request.data

    # If user is NOT superuser, route to ChangeRequest approval queue
    if not request.user.is_superuser:
        from apps.problems.models import ChangeRequest
        cr = ChangeRequest.objects.create(
            entity_type="contest",
            action="UPDATE",
            status="PENDING",
            target_id=contest.id,
            title_preview=contest.title,
            payload=data,
            requested_by=request.user,
        )
        return Response({
            "detail": f'Update request for contest "{contest.title}" submitted for Superadmin approval.',
            "pending": True,
            "request_id": str(cr.id),
        }, status=status.HTTP_202_ACCEPTED)

    # ── Superadmin Direct Execution ───────────────────────────────────────────
    if "title" in data:
        contest.title = data["title"].strip()
    if "description" in data:
        contest.description = data["description"].strip()
    if "type" in data:
        contest.type = data["type"]
    if "scoring_mode" in data:
        contest.scoring_mode = data["scoring_mode"]
    if "start_time" in data:
        contest.start_time = data["start_time"]
    if "end_time" in data:
        contest.end_time = data["end_time"]
    if "access_code" in data:
        contest.access_code = data["access_code"].strip() or None
    if "is_rated" in data:
        contest.is_rated = bool(data["is_rated"])
    if "status" in data:
        contest.status = data["status"]

    contest.save()

    if "problems" in data:
        contest.contest_problems.all().delete()
        from apps.problems.models import Problem
        from .models import ContestProblem

        for idx, item in enumerate(data["problems"]):
            prob_id = item.get("id") if isinstance(item, dict) else item
            points = item.get("points", 100) if isinstance(item, dict) else 100
            prob = Problem.objects.filter(id=prob_id).first()
            if prob:
                ContestProblem.objects.create(
                    contest=contest,
                    problem=prob,
                    points=points,
                    order_index=idx,
                )

    return Response({"detail": "Contest updated.", "id": str(contest.id)}, status=status.HTTP_200_OK)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def mod_contest_delete(request, contest_id):
    """
    Moderator endpoint: delete a contest.
    """
    denied = _require_moderator(request)
    if denied:
        return denied

    contest = get_object_or_404(Contest, id=contest_id)

    # If user is NOT superuser, route to ChangeRequest approval queue
    if not request.user.is_superuser:
        from apps.problems.models import ChangeRequest
        cr = ChangeRequest.objects.create(
            entity_type="contest",
            action="DELETE",
            status="PENDING",
            target_id=contest.id,
            title_preview=contest.title,
            payload={},
            requested_by=request.user,
        )
        return Response({
            "detail": f'Deletion request for contest "{contest.title}" submitted for Superadmin approval.',
            "pending": True,
            "request_id": str(cr.id),
        }, status=status.HTTP_202_ACCEPTED)

    # ── Superadmin Direct Execution ───────────────────────────────────────────
    title = contest.title
    contest.delete()
    return Response({"detail": f'Contest "{title}" deleted.'}, status=status.HTTP_200_OK)


