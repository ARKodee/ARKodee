from django.urls import path
from . import views

urlpatterns = [
    path("", views.problems_list, name="problems_list"),
    path("submission-calendar/", views.submission_calendar, name="submission_calendar"),

    # ── Superadmin Approval Queue Endpoints ────────────────────────────────────
    path("admin/requests/", views.admin_requests_list, name="admin_requests_list"),
    path("admin/requests/<uuid:request_id>/approve/", views.admin_request_approve, name="admin_request_approve"),
    path("admin/requests/<uuid:request_id>/reject/", views.admin_request_reject, name="admin_request_reject"),

    # ── Moderator CRUD — must come BEFORE <slug> catch-all ────────────────────
    path("mod/", views.mod_problems_list, name="mod_problems_list"),
    path("mod/create/", views.mod_problem_create, name="mod_problem_create"),
    path("mod/<uuid:problem_id>/", views.mod_problem_detail, name="mod_problem_detail"),
    path("mod/<uuid:problem_id>/update/", views.mod_problem_update, name="mod_problem_update"),
    path("mod/<uuid:problem_id>/delete/", views.mod_problem_delete, name="mod_problem_delete"),

    # ── Player routes (slug catch-alls — must come AFTER mod/) ────────────────
    path("<slug:problem_slug>/", views.problem_detail, name="problem_detail"),
    path("<slug:problem_slug>/run/", views.run_code, name="run_code"),
    path("<slug:problem_slug>/submit/", views.submit_code, name="submit_code"),
    path("<slug:problem_slug>/submissions/", views.problem_submissions, name="problem_submissions"),
]

