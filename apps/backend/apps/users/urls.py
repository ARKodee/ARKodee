from django.urls import path
from . import views


app_name = "users"

urlpatterns = [
    path("health/", views.health_check, name="health-check")
]