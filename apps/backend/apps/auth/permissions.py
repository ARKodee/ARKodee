from rest_framework.permissions import BasePermission


# ==========================================
# ✅ Permission: Competitor (any authenticated user)
# ==========================================
class IsCompetitor(BasePermission):
    """
    Grants access to any authenticated user regardless of role.
    Equivalent to IsAuthenticated but semantically named for role clarity.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)


# ==========================================
# ✅ Permission: Moderator / Contributor Tier
# ==========================================
class IsModerator(BasePermission):
    """
    Grants access to users whose role resolves to 'moderator' or 'superadmin'.
    Checks Django is_staff flag AND UserStats.role as fallback.

    Allowed:
      - is_staff = True
      - UserStats.role in ('moderator', 'superadmin')
      - is_superuser = True
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        if request.user.is_superuser or request.user.is_staff:
            return True

        stats_role = getattr(getattr(request.user, "stats", None), "role", None)
        return stats_role in ("moderator", "superadmin")


# ==========================================
# ✅ Permission: Superadmin (Top-Tier Admin)
# ==========================================
class IsSuperadmin(BasePermission):
    """
    Grants access exclusively to superadmin-tier users.
    Checks Django is_superuser flag AND UserStats.role = 'superadmin'.

    Only allowed:
      - is_superuser = True
      - UserStats.role == 'superadmin'
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False

        if request.user.is_superuser:
            return True

        stats_role = getattr(getattr(request.user, "stats", None), "role", None)
        return stats_role == "superadmin"
