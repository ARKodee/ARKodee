from django.apps import AppConfig


class ContestsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.contests'
    label = 'contests_app'
    verbose_name = 'Contests'
