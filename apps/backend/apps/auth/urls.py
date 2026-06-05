from django.urls import path
from . import views

app_name = "auth"

urlpatterns = [
    # Step 1: Check if email exists
    # ✅ PUBLIC endpoint: /api/auth/check-email
    path("check-email", views.check_email, name="check-email"),

    # Step 2 (Existing User): Login
    # ✅ PUBLIC endpoint: /api/auth/login
    path("login", views.login_user, name="login"),

    # Step 2 (New User): Register
    # ✅ PUBLIC endpoint: /api/auth/register
    path("register", views.register_user, name="register"),

    # Revoke Session: Logout
    # ❌ PROTECTED endpoint: /api/auth/logout (Requires Token)
    path("logout", views.logout_user, name="logout"),

    # Get User Data: Profile
    # ❌ PROTECTED endpoint: /api/auth/profile (Requires Token)
    path("profile", views.get_profile, name="profile"),
]
