import sys
import os
import subprocess
import tempfile
import ast
from django.db.models import Q
from django.db.models.functions import TruncDate
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Problem, TestCase, Submission, UserProblemStats, DailyBug, UserBugSolve
from .template_helpers import get_problem_templates
from .serializers import (
    ProblemListSerializer,
    ProblemDetailSerializer,
    SubmissionHistorySerializer,
    CodeExecutionRequestSerializer,
)
from django.core.exceptions import ValidationError

def get_problem_by_identifier(identifier):
    """
    Robust lookup helper that resolves a Problem by either its UUID id or slug string.
    """
    queryset = Problem.objects.filter(status="approved")
    try:
        return queryset.get(id=identifier)
    except (ValidationError, Problem.DoesNotExist, ValueError):
        pass
    return get_object_or_404(queryset, slug=identifier)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def problems_list(request):
    search_query = request.query_params.get("search", "").strip()
    difficulty_query = request.query_params.get("difficulty", "").strip().lower()
    
    # Calculate global metrics on database level (extremely cheap & indexed count queries)
    total_problems = Problem.objects.filter(status="approved").count()
    solved_count = UserProblemStats.objects.filter(user=request.user, status="solved").count()
    attempted_count = UserProblemStats.objects.filter(user=request.user).exclude(status="solved").count()
    
    # Calculate global score (Easy=100, Medium=200, Hard=300) dynamically via DB annotations
    from django.db.models import Case, When, Value, IntegerField, Sum
    solved_problems = Problem.objects.filter(
        status="approved",
        user_stats__user=request.user,
        user_stats__status="solved"
    )
    total_score = solved_problems.annotate(
        pts=Case(
            When(difficulty="easy", then=Value(100)),
            When(difficulty="medium", then=Value(200)),
            default=Value(300),
            output_field=IntegerField()
        )
    ).aggregate(total=Sum("pts"))["total"] or 0
    
    problems = Problem.objects.filter(status="approved").prefetch_related("tags")
    
    if search_query:
        if search_query.isdigit():
            problems = problems.filter(
                Q(serial_no=int(search_query)) | Q(title__icontains=search_query)
            )
        else:
            problems = problems.filter(Q(title__icontains=search_query))
        
    if difficulty_query and difficulty_query != "all":
        problems = problems.filter(difficulty=difficulty_query)
        
    total_filtered_count = problems.count()
    
    # Parse pagination parameters
    try:
        page = int(request.query_params.get("page", 1))
        if page < 1:
            page = 1
    except ValueError:
        page = 1
        
    try:
        page_size = int(request.query_params.get("page_size", 15))
        if page_size < 1:
            page_size = 15
    except ValueError:
        page_size = 15
        
    start_idx = (page - 1) * page_size
    end_idx = page * page_size
    
    # Slice the query set to only load displayed window
    paginated_problems = problems.order_by("serial_no")[start_idx:end_idx]
    
    # Fetch progress status ONLY for the sliced problem set (huge query cost saver!)
    paginated_problem_ids = [p.id for p in paginated_problems]
    stats = {
        s.problem_id: s.status
        for s in UserProblemStats.objects.filter(user=request.user, problem_id__in=paginated_problem_ids)
    }
    
    serializer = ProblemListSerializer(
        paginated_problems,
        many=True,
        context={"user_stats": stats}
    )
    return Response({
        "results": serializer.data,
        "total_problems": total_problems,
        "solved_count": solved_count,
        "attempted_count": attempted_count,
        "total_filtered_count": total_filtered_count,
        "page": page,
        "page_size": page_size,
        "total_score": total_score
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def submission_calendar(request):
    submissions = (
        Submission.objects.filter(user=request.user, verdict="AC")
        .annotate(date=TruncDate("submitted_at"))
        .values("date")
        .annotate(count=Count("id"))
        .order_by("date")
    )
    
    calendar_data = {}
    for item in submissions:
        if item["date"]:
            calendar_data[item["date"].strftime("%Y-%m-%d")] = item["count"]
            
    return Response(calendar_data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def problem_detail(request, problem_slug):
    problem = get_problem_by_identifier(problem_slug)
    try:
        templates = get_problem_templates(problem.id)
    except Exception:
        templates = {}
    
    serializer = ProblemDetailSerializer(
        problem,
        context={"templates": templates}
    )
    return Response(serializer.data, status=status.HTTP_200_OK)


from .sandbox import run_code_in_sandbox, format_input_for_sandbox



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def run_code(request, problem_slug):
    problem = get_problem_by_identifier(problem_slug)
    
    req_serializer = CodeExecutionRequestSerializer(data=request.data)
    if not req_serializer.is_valid():
        return Response(req_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    code = req_serializer.validated_data["code"]
    language = req_serializer.validated_data["language"]
    
    custom_cases_data = request.data.get("custom_cases")
    if custom_cases_data and isinstance(custom_cases_data, list) and len(custom_cases_data) > 0:
        class SimpleTestCase:
            def __init__(self, inp, exp):
                self.input = inp
                self.expected_output = exp
        eval_cases = [
            SimpleTestCase(tc.get("input", ""), tc.get("expected_output", tc.get("expected", "")))
            for tc in custom_cases_data
            if isinstance(tc, dict) and "input" in tc
        ]
    else:
        eval_cases = list(problem.test_cases.filter(is_sample=True).order_by("order_index"))
        if not eval_cases:
            eval_cases = list(problem.test_cases.all().order_by("order_index")[:3])

    if not eval_cases:
        return Response({"error": "No test cases defined for this problem."}, status=status.HTTP_400_BAD_REQUEST)
        
    # Get Python signature templates from PostgreSQL to drive LeetCode-style run
    templates = {}
    try:
        templates = get_problem_templates(str(problem.id))
    except Exception:
        pass
    starter_code = templates.get("python", "")
    
    verdict, results, compile_error = run_code_in_sandbox(code, language, eval_cases, problem.time_limit_ms, starter_code)
    
    return Response({
        "verdict": verdict,
        "compile_error": compile_error,
        "results": results
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_code(request, problem_slug):
    problem = get_problem_by_identifier(problem_slug)
    
    req_serializer = CodeExecutionRequestSerializer(data=request.data)
    if not req_serializer.is_valid():
        return Response(req_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    code = req_serializer.validated_data["code"]
    language = req_serializer.validated_data["language"]
    
    all_cases = problem.test_cases.all().order_by("order_index")
    if not all_cases.exists():
        return Response({"error": "No test cases defined for this problem."}, status=status.HTTP_400_BAD_REQUEST)
        
    # Get Python signature templates from PostgreSQL to drive LeetCode-style submit
    templates = {}
    try:
        templates = get_problem_templates(str(problem.id))
    except Exception:
        pass
    starter_code = templates.get("python", "")
    
    verdict, results, compile_error = run_code_in_sandbox(code, language, all_cases, problem.time_limit_ms, starter_code, stop_on_first_fail=True)
    
    # Calculate passed test cases count
    passed_count = sum(1 for r in results if r.get("passed"))
    total_count = len(all_cases)
    
    contest_identifier = request.data.get("contest_id") or request.data.get("contest_slug")
    contest_obj = None
    if contest_identifier:
        try:
            from apps.contests.models import Contest
            contest_obj = Contest.objects.filter(id=contest_identifier).first() or Contest.objects.filter(slug=contest_identifier).first()
        except Exception:
            pass

    # Update UserProblemStats using the base verdict
    stats, created = UserProblemStats.objects.get_or_create(
        user=request.user,
        problem=problem,
    )
    stats.attempts_count += 1
    
    if verdict == "AC":
        stats.status = "solved"
    elif stats.status != "solved":
        stats.status = "attempted"
    stats.save()

    # Format verdict on failure for the HTTP response to show exact failed testcase (1-based index)
    if verdict == "CE":
        formatted_verdict = "Compilation Error"
    elif verdict == "WA":
        formatted_verdict = f"Wrong Answer on Testcase {passed_count + 1}"
    elif verdict == "RE":
        formatted_verdict = f"Runtime Error on Testcase {passed_count + 1}"
    elif verdict == "TLE":
        formatted_verdict = f"Time Limit Exceeded on Testcase {passed_count + 1}"
    else:
        formatted_verdict = "AC"

    # Create submission record
    submission = Submission.objects.create(
        user=request.user,
        problem=problem,
        contest=contest_obj,
        language=language,
        code=code,
        verdict=verdict,
        test_cases_passed=passed_count,
        total_test_cases=total_count,
    )
    
    # Strip testcase inputs/outputs for contest submissions to prevent inspecting hidden testcases
    if contest_obj is not None:
        stripped_results = []
        for r in results[:3]:
            stripped_r = {
                "passed": r.get("passed", False),
                "verdict": r.get("verdict", ""),
            }
            if r.get("verdict") in ["CE", "RE"]:
                stripped_r["error"] = r.get("error", "")
            stripped_results.append(stripped_r)
        response_results = stripped_results
    else:
        response_results = results

    return Response({
        "submission_id": str(submission.id),
        "verdict": formatted_verdict,
        "compile_error": compile_error,
        "passed_count": passed_count,
        "total_count": total_count,
        "results": response_results
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def problem_submissions(request, problem_slug):
    problem = get_problem_by_identifier(problem_slug)
    # Fetch all submissions for this problem by the authenticated user, newest first
    submissions = Submission.objects.filter(problem=problem, user=request.user).order_by("-submitted_at")
    serializer = SubmissionHistorySerializer(submissions, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ═══════════════════════════════════════════════════════════════════════════════
# MODERATOR CRUD VIEWS
# All views below require is_staff or is_superuser.
# ═══════════════════════════════════════════════════════════════════════════════

def _require_moderator(request):
    """Returns None if allowed, or a 403 Response if not."""
    if not (request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser)):
        return Response({"detail": "Moderator access required."}, status=status.HTTP_403_FORBIDDEN)
    return None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mod_problems_list(request):
    """
    Moderator endpoint: return ALL problems regardless of status.
    Supports search, difficulty, status filters + page-based pagination (25/page).
    N+1 free: uses Count annotation instead of per-row .count() calls.
    """
    denied = _require_moderator(request)
    if denied:
        return denied

    from django.db.models import Count as DjCount

    search_query    = request.query_params.get("search", "").strip()
    difficulty_query = request.query_params.get("difficulty", "").strip().lower()
    status_query    = request.query_params.get("status", "").strip().lower()
    page            = max(int(request.query_params.get("page", 1)), 1)
    page_size       = 25

    problems = (
        Problem.objects
        .prefetch_related("tags")
        .annotate(test_case_count=DjCount("test_cases"))
        .order_by("-created_at")
    )

    if search_query:
        problems = problems.filter(
            Q(title__icontains=search_query) | Q(description__icontains=search_query)
        )
    if difficulty_query and difficulty_query != "all":
        problems = problems.filter(difficulty=difficulty_query)
    if status_query and status_query != "all":
        problems = problems.filter(status=status_query)

    total   = problems.count()
    offset  = (page - 1) * page_size
    page_qs = problems[offset: offset + page_size]

    data = [
        {
            "id": str(p.id),
            "slug": p.slug,
            "title": p.title,
            "difficulty": p.difficulty.upper(),
            "status": p.status,
            "tags": [t.name for t in p.tags.all()],
            "test_case_count": p.test_case_count,
            "created_at": p.created_at.isoformat(),
        }
        for p in page_qs
    ]

    return Response({
        "count":    total,
        "page":     page,
        "page_size": page_size,
        "total_pages": max((total + page_size - 1) // page_size, 1),
        "results":  data,
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mod_problem_detail(request, problem_id):
    """
    Moderator endpoint: return full problem data including all test cases for editing.
    Accepts UUID id (not slug, to support pending problems without slugs).
    """
    denied = _require_moderator(request)
    if denied:
        return denied

    problem = get_object_or_404(Problem, id=problem_id)
    test_cases = list(problem.test_cases.all().order_by("order_index").values(
        "id", "input", "expected_output", "is_sample", "order_index"
    ))

    return Response({
        "id": str(problem.id),
        "slug": problem.slug,
        "title": problem.title,
        "description": problem.description,
        "difficulty": problem.difficulty,
        "status": problem.status,
        "tags": [t.name for t in problem.tags.all()],
        "constraints": problem.constraints or "",
        "input_format": problem.input_format or "",
        "output_format": problem.output_format or "",
        "sample_input": problem.sample_input or "",
        "sample_output": problem.sample_output or "",
        "time_limit_ms": problem.time_limit_ms,
        "memory_limit_mb": problem.memory_limit_mb,
        "is_active": problem.is_active,
        "test_cases": [
            {
                "id": str(tc["id"]),
                "input": tc["input"],
                "expected_output": tc["expected_output"],
                "is_sample": tc["is_sample"],
                "order_index": tc["order_index"],
            }
            for tc in test_cases
        ],
    }, status=status.HTTP_200_OK)


import re
from django.utils.text import slugify


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mod_problem_create(request):
    """
    Moderator endpoint: create a new problem with test cases.
    If requested by Moderator (is_staff), creates a PENDING ChangeRequest for Superadmin approval.
    If requested by Superadmin (is_superuser), executes directly.
    """
    denied = _require_moderator(request)
    if denied:
        return denied

    data = request.data
    test_cases_data = data.get("test_cases", [])

    # ── Validation ────────────────────────────────────────────────────────────
    if not data.get("title", "").strip():
        return Response({"detail": "Title is required."}, status=status.HTTP_400_BAD_REQUEST)
    if not data.get("description", "").strip():
        return Response({"detail": "Description is required."}, status=status.HTTP_400_BAD_REQUEST)
    if data.get("difficulty", "").lower() not in ("easy", "medium", "hard"):
        return Response({"detail": "Difficulty must be easy, medium, or hard."}, status=status.HTTP_400_BAD_REQUEST)
    if len(test_cases_data) < 15:
        return Response(
            {"detail": f"Minimum 15 test cases required. You provided {len(test_cases_data)}."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # If user is NOT superuser, route to ChangeRequest approval queue
    if not request.user.is_superuser:
        from .models import ChangeRequest
        cr = ChangeRequest.objects.create(
            entity_type="problem",
            action="CREATE",
            status="PENDING",
            title_preview=data["title"].strip(),
            payload=data,
            requested_by=request.user,
        )
        return Response({
            "detail": "Problem creation request submitted for Superadmin approval.",
            "pending": True,
            "request_id": str(cr.id),
        }, status=status.HTTP_202_ACCEPTED)

    # ── Superadmin Direct Execution ───────────────────────────────────────────
    base_slug = slugify(data["title"])
    slug = base_slug
    counter = 1
    while Problem.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1

    problem = Problem.objects.create(
        title=data["title"].strip(),
        slug=slug,
        description=data["description"].strip(),
        difficulty=data["difficulty"].lower(),
        constraints=data.get("constraints", ""),
        input_format=data.get("input_format", ""),
        output_format=data.get("output_format", ""),
        sample_input=data.get("sample_input", ""),
        sample_output=data.get("sample_output", ""),
        time_limit_ms=int(data.get("time_limit_ms", 2000)),
        memory_limit_mb=int(data.get("memory_limit_mb", 256)),
        status=data.get("status", "approved"),
        created_by=request.user,
    )

    from .models import Tag
    for tag_name in data.get("tags", []):
        tag_name = tag_name.strip()
        if tag_name:
            tag, _ = Tag.objects.get_or_create(name=tag_name)
            problem.tags.add(tag)

    for idx, tc in enumerate(test_cases_data):
        TestCase.objects.create(
            problem=problem,
            input=tc.get("input", ""),
            expected_output=tc.get("expected_output", ""),
            is_sample=tc.get("is_sample", False),
            order_index=idx,
        )

    return Response({"detail": "Problem created.", "id": str(problem.id), "slug": problem.slug}, status=status.HTTP_201_CREATED)


@api_view(["PUT", "PATCH"])
@permission_classes([IsAuthenticated])
def mod_problem_update(request, problem_id):
    """
    Moderator endpoint: update an existing problem and replace its test cases.
    """
    denied = _require_moderator(request)
    if denied:
        return denied

    problem = get_object_or_404(Problem, id=problem_id)
    data = request.data

    test_cases_data = data.get("test_cases")
    if test_cases_data is not None and len(test_cases_data) < 15:
        return Response(
            {"detail": f"Minimum 15 test cases required. You provided {len(test_cases_data)}."},
            status=status.HTTP_400_BAD_REQUEST
        )

    # If user is NOT superuser, route to ChangeRequest approval queue
    if not request.user.is_superuser:
        from .models import ChangeRequest
        cr = ChangeRequest.objects.create(
            entity_type="problem",
            action="UPDATE",
            status="PENDING",
            target_id=problem.id,
            title_preview=problem.title,
            payload=data,
            requested_by=request.user,
        )
        return Response({
            "detail": f'Update request for "{problem.title}" submitted for Superadmin approval.',
            "pending": True,
            "request_id": str(cr.id),
        }, status=status.HTTP_202_ACCEPTED)

    # ── Superadmin Direct Execution ───────────────────────────────────────────
    if "title" in data:
        problem.title = data["title"].strip()
    if "description" in data:
        problem.description = data["description"].strip()
    if "difficulty" in data:
        problem.difficulty = data["difficulty"].lower()
    if "constraints" in data:
        problem.constraints = data["constraints"]
    if "input_format" in data:
        problem.input_format = data["input_format"]
    if "output_format" in data:
        problem.output_format = data["output_format"]
    if "sample_input" in data:
        problem.sample_input = data["sample_input"]
    if "sample_output" in data:
        problem.sample_output = data["sample_output"]
    if "time_limit_ms" in data:
        problem.time_limit_ms = int(data["time_limit_ms"])
    if "memory_limit_mb" in data:
        problem.memory_limit_mb = int(data["memory_limit_mb"])
    if "status" in data:
        problem.status = data["status"]

    problem.save()

    if "tags" in data:
        from .models import Tag
        problem.tags.clear()
        for tag_name in data["tags"]:
            tag_name = tag_name.strip()
            if tag_name:
                tag, _ = Tag.objects.get_or_create(name=tag_name)
                problem.tags.add(tag)

    if test_cases_data is not None:
        problem.test_cases.all().delete()
        for idx, tc in enumerate(test_cases_data):
            TestCase.objects.create(
                problem=problem,
                input=tc.get("input", ""),
                expected_output=tc.get("expected_output", ""),
                is_sample=tc.get("is_sample", False),
                order_index=idx,
            )

    return Response({"detail": "Problem updated.", "id": str(problem.id)}, status=status.HTTP_200_OK)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def mod_problem_delete(request, problem_id):
    """
    Moderator endpoint: delete a problem.
    """
    denied = _require_moderator(request)
    if denied:
        return denied

    problem = get_object_or_404(Problem, id=problem_id)

    # If user is NOT superuser, route to ChangeRequest approval queue
    if not request.user.is_superuser:
        from .models import ChangeRequest
        cr = ChangeRequest.objects.create(
            entity_type="problem",
            action="DELETE",
            status="PENDING",
            target_id=problem.id,
            title_preview=problem.title,
            payload={},
            requested_by=request.user,
        )
        return Response({
            "detail": f'Deletion request for "{problem.title}" submitted for Superadmin approval.',
            "pending": True,
            "request_id": str(cr.id),
        }, status=status.HTTP_202_ACCEPTED)

    # ── Superadmin Direct Execution ───────────────────────────────────────────
    title = problem.title
    problem.delete()
    return Response({"detail": f'Problem "{title}" deleted.'}, status=status.HTTP_200_OK)


# ═══════════════════════════════════════════════════════════════════════════════
# SUPERADMIN APPROVAL QUEUE VIEWS
# ═══════════════════════════════════════════════════════════════════════════════

def _require_superadmin(request):
    if not (request.user.is_authenticated and (request.user.is_superuser or getattr(getattr(request.user, "stats", None), "role", None) == "superadmin")):
        return Response({"detail": "Superadmin access required."}, status=status.HTTP_403_FORBIDDEN)
    return None


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_requests_list(request):
    """
    Superadmin endpoint: list change requests with status and entity filters.
    """
    denied = _require_superadmin(request)
    if denied:
        return denied

    from .models import ChangeRequest

    status_filter = request.query_params.get("status", "PENDING").upper()
    entity_filter = request.query_params.get("entity_type", "all").lower()

    qs = ChangeRequest.objects.select_related("requested_by", "reviewed_by").all()

    if status_filter and status_filter != "ALL":
        qs = qs.filter(status=status_filter)
    if entity_filter and entity_filter != "all":
        qs = qs.filter(entity_type=entity_filter)

    data = [
        {
            "id": str(cr.id),
            "entity_type": cr.entity_type,
            "action": cr.action,
            "status": cr.status,
            "target_id": str(cr.target_id) if cr.target_id else None,
            "title_preview": cr.title_preview,
            "requested_by": cr.requested_by.username,
            "reviewed_by": cr.reviewed_by.username if cr.reviewed_by else None,
            "rejection_reason": cr.rejection_reason,
            "created_at": cr.created_at.isoformat(),
            "reviewed_at": cr.reviewed_at.isoformat() if cr.reviewed_at else None,
            "payload": cr.payload,
        }
        for cr in qs
    ]

    return Response(data, status=status.HTTP_200_OK)


from datetime import datetime
from django.db import transaction as db_transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime

def _parse_dt(val):
    if not val:
        return None
    if isinstance(val, datetime):
        if timezone.is_naive(val):
            return timezone.make_aware(val)
        return val
    if isinstance(val, str):
        val_str = val.strip()
        if len(val_str) == 16 and "T" in val_str:
            val_str += ":00"
        dt = parse_datetime(val_str)
        if not dt:
            try:
                dt = datetime.fromisoformat(val_str.replace("Z", "+00:00"))
            except Exception:
                pass
        if dt:
            if timezone.is_naive(dt):
                return timezone.make_aware(dt)
            return dt
    return None

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_request_approve(request, request_id):
    """
    Superadmin endpoint: approve a pending change request and apply the changes to DB.
    Uses select_for_update and atomic transaction to prevent double approval race conditions.
    """
    denied = _require_superadmin(request)
    if denied:
        return denied

    from .models import ChangeRequest, Tag

    with db_transaction.atomic():
        cr = ChangeRequest.objects.select_for_update().filter(id=request_id).first()
        if not cr:
            return Response({"detail": "Change request not found."}, status=status.HTTP_404_NOT_FOUND)

        if cr.status != "PENDING":
            return Response({"detail": f"Request is already {cr.status}."}, status=status.HTTP_400_BAD_REQUEST)

        # Mark APPROVED immediately inside atomic lock to prevent race conditions / duplicate approvals
        cr.status = "APPROVED"
        cr.reviewed_by = request.user
        cr.reviewed_at = timezone.now()
        cr.save()

        payload = cr.payload or {}

        try:
            if cr.entity_type == "problem":
                if cr.action == "CREATE":
                    base_slug = slugify(payload.get("title", "problem"))
                    slug = base_slug
                    counter = 1
                    while Problem.objects.filter(slug=slug).exists():
                        slug = f"{base_slug}-{counter}"
                        counter += 1

                    prob = Problem.objects.create(
                        title=payload.get("title", "").strip(),
                        slug=slug,
                        description=payload.get("description", "").strip(),
                        difficulty=payload.get("difficulty", "medium").lower(),
                        constraints=payload.get("constraints", ""),
                        input_format=payload.get("input_format", ""),
                        output_format=payload.get("output_format", ""),
                        sample_input=payload.get("sample_input", ""),
                        sample_output=payload.get("sample_output", ""),
                        time_limit_ms=int(payload.get("time_limit_ms", 2000)),
                        memory_limit_mb=int(payload.get("memory_limit_mb", 256)),
                        status="approved",
                        created_by=cr.requested_by,
                    )
                    for tag_name in payload.get("tags", []):
                        tag_name = tag_name.strip()
                        if tag_name:
                            tag, _ = Tag.objects.get_or_create(name=tag_name)
                            prob.tags.add(tag)

                    for idx, tc in enumerate(payload.get("test_cases", [])):
                        TestCase.objects.create(
                            problem=prob,
                            input=tc.get("input", ""),
                            expected_output=tc.get("expected_output", ""),
                            is_sample=tc.get("is_sample", False),
                            order_index=idx,
                        )

                elif cr.action == "UPDATE":
                    prob = Problem.objects.filter(id=cr.target_id).first()
                    if prob:
                        if "title" in payload: prob.title = payload["title"].strip()
                        if "description" in payload: prob.description = payload["description"].strip()
                        if "difficulty" in payload: prob.difficulty = payload["difficulty"].lower()
                        if "time_limit_ms" in payload: prob.time_limit_ms = int(payload["time_limit_ms"])
                        if "memory_limit_mb" in payload: prob.memory_limit_mb = int(payload["memory_limit_mb"])
                        prob.status = "approved"
                        prob.save()

                        if "test_cases" in payload:
                            prob.test_cases.all().delete()
                            for idx, tc in enumerate(payload["test_cases"]):
                                TestCase.objects.create(
                                    problem=prob,
                                    input=tc.get("input", ""),
                                    expected_output=tc.get("expected_output", ""),
                                    is_sample=tc.get("is_sample", False),
                                    order_index=idx,
                                )

                elif cr.action == "DELETE":
                    Problem.objects.filter(id=cr.target_id).delete()

            elif cr.entity_type == "contest":
                from apps.contests.models import Contest, ContestProblem
                if cr.action == "CREATE":
                    base_slug = slugify(payload.get("title", "contest"))
                    slug = base_slug
                    counter = 1
                    while Contest.objects.filter(slug=slug).exists():
                        slug = f"{base_slug}-{counter}"
                        counter += 1

                    # Parse datetime safely with _parse_dt
                    st_val = payload.get("start_time")
                    et_val = payload.get("end_time")
                    start_dt = _parse_dt(st_val)
                    end_dt = _parse_dt(et_val)

                    if not start_dt or not end_dt:
                        cr.status = "PENDING"
                        cr.save()
                        return Response(
                            {"detail": f"Invalid start time ({st_val}) or end time ({et_val}) format in payload."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

                    contest = Contest.objects.create(
                        title=payload.get("title", "").strip(),
                        slug=slug,
                        description=payload.get("description", "").strip(),
                        type=payload.get("type", "public"),
                        scoring_mode=payload.get("scoring_mode", "leetcode"),
                        start_time=start_dt,
                        end_time=end_dt,
                        access_code=payload.get("access_code", "").strip() or None,
                        is_rated=bool(payload.get("is_rated", True)),
                        eligible_class_tier=payload.get("eligible_class_tier", "all"),
                        status="approved",
                    )
                    for idx, item in enumerate(payload.get("problems", [])):
                        prob_id = item.get("id") if isinstance(item, dict) else item
                        points = item.get("points", 100) if isinstance(item, dict) else 100
                        p = Problem.objects.filter(id=prob_id).first()
                        if p:
                            ContestProblem.objects.create(
                                contest=contest, problem=p, points=points, order_index=idx
                            )

                elif cr.action == "UPDATE":
                    contest = Contest.objects.filter(id=cr.target_id).first()
                    if contest:
                        if "title" in payload: contest.title = payload["title"].strip()
                        if "description" in payload: contest.description = payload["description"].strip()
                        if "type" in payload: contest.type = payload["type"]
                        if "scoring_mode" in payload: contest.scoring_mode = payload["scoring_mode"]
                        if "start_time" in payload:
                            st_val = payload["start_time"]
                            contest.start_time = _parse_dt(st_val) or contest.start_time
                        if "end_time" in payload:
                            et_val = payload["end_time"]
                            contest.end_time = _parse_dt(et_val) or contest.end_time
                        if "access_code" in payload: contest.access_code = payload["access_code"].strip() or None
                        if "eligible_class_tier" in payload: contest.eligible_class_tier = payload["eligible_class_tier"]
                        contest.save()

                        if "problems" in payload:
                            contest.contest_problems.all().delete()
                            for idx, item in enumerate(payload["problems"]):
                                prob_id = item.get("id") if isinstance(item, dict) else item
                                points = item.get("points", 100) if isinstance(item, dict) else 100
                                p = Problem.objects.filter(id=prob_id).first()
                                if p:
                                    ContestProblem.objects.create(
                                        contest=contest, problem=p, points=points, order_index=idx
                                    )

                elif cr.action == "DELETE":
                    Contest.objects.filter(id=cr.target_id).delete()

        except Exception as e:
            # Revert status to PENDING if an error occurred during creation
            cr.status = "PENDING"
            cr.reviewed_by = None
            cr.reviewed_at = None
            cr.save()
            return Response({"detail": f"Execution error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({"detail": "Request approved and executed successfully."}, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_request_reject(request, request_id):
    """
    Superadmin endpoint: reject a pending change request with feedback.
    """
    denied = _require_superadmin(request)
    if denied:
        return denied

    from .models import ChangeRequest
    cr = get_object_or_404(ChangeRequest, id=request_id)

    if cr.status != "PENDING":
        return Response({"detail": f"Request is already {cr.status}."}, status=status.HTTP_400_BAD_REQUEST)

    reason = request.data.get("rejection_reason", "").strip()

    cr.status = "REJECTED"
    cr.rejection_reason = reason
    cr.reviewed_by = request.user
    cr.reviewed_at = timezone.now()
    cr.save()

    return Response({"detail": "Request rejected."}, status=status.HTTP_200_OK)


import datetime
from django.utils import timezone
from apps.auth.models import UserStats

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def daily_bug_summary(request):
    """
    Returns a summary of today's DailyBug challenge.
    If none exists for today's date, falls back to the most recent DailyBug.
    """
    today = datetime.date.today()
    bug = DailyBug.objects.filter(date=today, is_active=True).first()
    if not bug:
        bug = DailyBug.objects.filter(is_active=True).order_by("-date").first()

    if not bug:
        return Response({"detail": "No active bug bounty today."}, status=status.HTTP_404_NOT_FOUND)

    is_solved = UserBugSolve.objects.filter(user=request.user, bug=bug).exists()
    
    stats_streak = 0
    try:
        stats = request.user.stats
        stats_streak = stats.streak
    except Exception:
        pass

    return Response({
        "bug_id": str(bug.id),
        "title": bug.title,
        "category": bug.category,
        "date": bug.date.isoformat(),
        "description": bug.description,
        "sample_input": bug.sample_input,
        "expected_output": bug.expected_output,
        "streak": stats_streak,
        "xp_reward": bug.xp_reward,
        "is_solved": is_solved
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def daily_bug_detail(request, bug_id):
    """
    Retrieves complete structural details for a target DailyBug challenge.
    """
    try:
        bug = DailyBug.objects.get(id=bug_id, is_active=True)
    except (DailyBug.DoesNotExist, ValidationError):
        return Response({"detail": "Bug bounty challenge not found."}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        "bug_id": str(bug.id),
        "title": bug.title,
        "category": bug.category,
        "description": bug.description,
        "line_budget": bug.line_budget,
        "xp_reward": bug.xp_reward,
        "starter_codes": bug.starter_codes,
        "examples": bug.examples
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def run_daily_bug(request, bug_id):
    """
    Executes user code against visible sample examples for a target DailyBug.
    """
    try:
        bug = DailyBug.objects.get(id=bug_id, is_active=True)
    except (DailyBug.DoesNotExist, ValidationError):
        return Response({"detail": "Bug bounty challenge not found."}, status=status.HTTP_404_NOT_FOUND)

    req_serializer = CodeExecutionRequestSerializer(data=request.data)
    if not req_serializer.is_valid():
        return Response(req_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    code = req_serializer.validated_data["code"]
    language = req_serializer.validated_data["language"]

    class SimpleTestCase:
        def __init__(self, inp, exp):
            self.input = inp
            self.expected_output = exp

    eval_cases = [
        SimpleTestCase(ex.get("input", ""), ex.get("output", ex.get("expected_output", "")))
        for ex in bug.examples
    ]

    if not eval_cases:
        # Fallback to test_cases_json if no examples listed
        eval_cases = [
            SimpleTestCase(tc.get("input", ""), tc.get("expected_output", tc.get("output", "")))
            for tc in bug.test_cases_json[:2]
        ]

    if not eval_cases:
        return Response({"detail": "No sample test cases defined for this bug."}, status=status.HTTP_400_BAD_REQUEST)

    starter_code = bug.starter_codes.get(language, "")

    from .sandbox import run_code_in_sandbox
    verdict, results, compile_error = run_code_in_sandbox(
        code, language, eval_cases, bug.time_limit_ms, starter_code
    )

    return Response({
        "verdict": verdict,
        "compile_error": compile_error,
        "results": results,
        "output": results[0].get("user_output", "") if results else ""
    }, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def submit_daily_bug(request, bug_id):
    """
    Submits user solution for full validation against hidden test cases.
    Marks solved and increments streak on success.
    """
    try:
        bug = DailyBug.objects.get(id=bug_id, is_active=True)
    except (DailyBug.DoesNotExist, ValidationError):
        return Response({"detail": "Bug bounty challenge not found."}, status=status.HTTP_404_NOT_FOUND)

    req_serializer = CodeExecutionRequestSerializer(data=request.data)
    if not req_serializer.is_valid():
        return Response(req_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    code = req_serializer.validated_data["code"]
    language = req_serializer.validated_data["language"]

    class SimpleTestCase:
        def __init__(self, inp, exp):
            self.input = inp
            self.expected_output = exp

    all_cases = [
        SimpleTestCase(tc.get("input", ""), tc.get("expected_output", tc.get("output", "")))
        for tc in bug.test_cases_json
    ]

    if not all_cases:
        # Fallback to examples if no hidden test cases
        all_cases = [
            SimpleTestCase(ex.get("input", ""), ex.get("output", ex.get("expected_output", "")))
            for ex in bug.examples
        ]

    if not all_cases:
        return Response({"detail": "No validation test cases defined for this bug."}, status=status.HTTP_400_BAD_REQUEST)

    starter_code = bug.starter_codes.get(language, "")

    from .sandbox import run_code_in_sandbox
    verdict, results, compile_error = run_code_in_sandbox(
        code, language, all_cases, bug.time_limit_ms, starter_code, stop_on_first_fail=True
    )

    passed = (verdict == "AC")

    if passed:
        # Register bug solve
        solve_entry, created = UserBugSolve.objects.get_or_create(
            user=request.user,
            bug=bug
        )
        if created:
            # Increment user solving streak
            try:
                stats, _ = UserStats.objects.get_or_create(user=request.user)
                # Check if user already solved another bug today
                already_solved_today = UserBugSolve.objects.filter(
                    user=request.user,
                    solved_at__date=datetime.date.today()
                ).exclude(bug=bug).exists()
                if not already_solved_today:
                    stats.streak += 1
                    stats.save()
            except Exception:
                pass

    error_msg = ""
    if not passed:
        if verdict == "CE":
            error_msg = compile_error or "Compilation Error"
        else:
            passed_count = sum(1 for r in results if r.get("passed"))
            error_msg = f"{verdict} on test case {passed_count + 1}"

    return Response({
        "passed": passed,
        "output": results[0].get("user_output", "") if results else "",
        "error": error_msg
    }, status=status.HTTP_200_OK)



