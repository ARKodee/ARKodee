from django.urls import path
from . import views

app_name = "duels"

urlpatterns = [
    path("create/", views.create_duel_view, name="duel-create"),
    path("history/", views.duel_history_view, name="duel-history"),
    path("problems/", views.duel_problems_view, name="duel-problems"),
]
