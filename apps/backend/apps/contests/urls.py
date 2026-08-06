from django.urls import path
from .views import (
    contests_list_view,
    contest_detail_view,
    contest_register_view,
    contest_start_virtual_view,
    contest_leaderboard_view,
    global_leaderboard_view,
    mod_contests_list,
    mod_contest_detail,
    mod_contest_create,
    mod_contest_update,
    mod_contest_delete,
)

app_name = "contests"

urlpatterns = [
    path("", contests_list_view, name="contests_list"),
    path("global-leaderboard/", global_leaderboard_view, name="global_leaderboard"),

    # ── Moderator CRUD — must come BEFORE <slug> catch-all ────────────────────
    path("mod/", mod_contests_list, name="mod_contests_list"),
    path("mod/create/", mod_contest_create, name="mod_contest_create"),
    path("mod/<uuid:contest_id>/", mod_contest_detail, name="mod_contest_detail"),
    path("mod/<uuid:contest_id>/update/", mod_contest_update, name="mod_contest_update"),
    path("mod/<uuid:contest_id>/delete/", mod_contest_delete, name="mod_contest_delete"),

    # ── Player routes (slug catch-alls — must come AFTER mod/) ────────────────
    path("<slug:slug>/", contest_detail_view, name="contest_detail"),
    path("<slug:slug>/register/", contest_register_view, name="contest_register"),
    path("<slug:slug>/start-virtual/", contest_start_virtual_view, name="contest_start_virtual"),
    path("<slug:slug>/leaderboard/", contest_leaderboard_view, name="contest_leaderboard"),
]
