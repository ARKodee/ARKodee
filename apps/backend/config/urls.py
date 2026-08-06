from django.contrib import admin
from django.urls import include, path
from apps.contests.views import global_leaderboard_view

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.auth.urls")),
    path("api/users/", include("apps.users.urls")),
    path("api/problems/", include("apps.problems.urls")),
    path("api/contests/", include("apps.contests.urls")),
    path("api/duels/", include("apps.duels.urls")),
    path("api/leaderboard/global/", global_leaderboard_view, name="global_leaderboard_root"),
]
