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
]
