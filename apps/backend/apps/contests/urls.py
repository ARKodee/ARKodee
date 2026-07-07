from django.urls import path
from .views import (
    contests_list_view,
    contest_detail_view,
    contest_register_view,
    contest_start_virtual_view,
    contest_leaderboard_view,
    global_leaderboard_view,
)

app_name = "contests"

urlpatterns = [
    path("", contests_list_view, name="contests_list"),
    path("global-leaderboard/", global_leaderboard_view, name="global_leaderboard"),
    path("<slug:slug>/", contest_detail_view, name="contest_detail"),
    path("<slug:slug>/register/", contest_register_view, name="contest_register"),
    path("<slug:slug>/start-virtual/", contest_start_virtual_view, name="contest_start_virtual"),
    path("<slug:slug>/leaderboard/", contest_leaderboard_view, name="contest_leaderboard"),
]
