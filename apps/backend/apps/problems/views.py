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

from .models import Problem, TestCase, Submission, UserProblemStats
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
    
    problems = Problem.objects.filter(status="approved").prefetch_related("tags")
    
    if search_query:
        problems = problems.filter(
            Q(title__icontains=search_query) | Q(description__icontains=search_query)
        )
        
    if difficulty_query and difficulty_query != "all":
        problems = problems.filter(difficulty=difficulty_query)
        
    # Get user problem stats
    stats = {
        s.problem_id: s.status
        for s in UserProblemStats.objects.filter(user=request.user)
    }
    
    serializer = ProblemListSerializer(
        problems,
        many=True,
        context={"user_stats": stats}
    )
    return Response(serializer.data, status=status.HTTP_200_OK)


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
    
    verdict, results, compile_error = run_code_in_sandbox(code, language, all_cases, problem.time_limit_ms, starter_code)
    
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
