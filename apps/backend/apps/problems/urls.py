from django.urls import path
from . import views

urlpatterns = [
    path("", views.problems_list, name="problems_list"),
    path("submission-calendar/", views.submission_calendar, name="submission_calendar"),
    path("<slug:problem_slug>/", views.problem_detail, name="problem_detail"),
    path("<slug:problem_slug>/run/", views.run_code, name="run_code"),
    path("<slug:problem_slug>/submit/", views.submit_code, name="submit_code"),
    path("<slug:problem_slug>/submissions/", views.problem_submissions, name="problem_submissions"),
]
