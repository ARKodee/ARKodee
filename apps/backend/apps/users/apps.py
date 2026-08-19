from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.users"         # 🎯 Full subfolder path
    label = "users_app"        # 🎯 Clean registry identification label
    verbose_name = "User Stats & Profiles"