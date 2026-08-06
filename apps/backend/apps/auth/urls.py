from django.urls import path
from . import views

app_name = "auth"

urlpatterns = [
    path("health/", views.health_check, name="health-check"),
    path("check-email/", views.check_email_view, name="check-email"),
    path("register/", views.register_view, name="register"),
    path("login/", views.login_view, name="login"),
    path("google/", views.google_login_view, name="google-login"),
    path("logout/", views.logout_view, name="logout"),
    path("profile/", views.profile_view, name="profile"),
    path("profile-stats/", views.profile_stats_view, name="profile-stats"),
    path("duels/create/", views.create_duel_view, name="duel-create"),
    path("duels/history/", views.duel_history_view, name="duel-history"),

    # Superadmin Player Management
    path("admin/players/", views.admin_players_list, name="admin-players-list"),
    path("admin/players/<int:user_id>/role/", views.admin_player_update_role, name="admin-player-role"),
    path("admin/players/<int:user_id>/ban/", views.admin_player_toggle_ban, name="admin-player-ban"),
    path("admin/players/<int:user_id>/flag/", views.admin_player_toggle_flag, name="admin-player-flag"),
    path("admin/players/<int:user_id>/rating/", views.admin_player_adjust_rating, name="admin-player-rating"),
]
