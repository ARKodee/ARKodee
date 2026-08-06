from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from rest_framework import status
from apps.auth.models import UserStats
from apps.problems.models import Problem
from .models import DuelMatch


class DuelMatchModelTests(TestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(username="usera", password="password")
        self.user_b = User.objects.create_user(username="userb", password="password")

    def test_duel_match_creation(self):
        match = DuelMatch.objects.create(
            player_a=self.user_a,
            player_b=self.user_b,
            winner=self.user_a,
            score_a=100,
            score_b=50,
            elo_delta_a=15,
            elo_delta_b=-15,
        )
        self.assertEqual(DuelMatch.objects.count(), 1)
        self.assertEqual(match.score_a, 100)
        self.assertEqual(match.score_b, 50)
        self.assertEqual(str(match), f"Duel {match.id}: usera vs userb")


class DuelMatchAPITests(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(username="usera", password="password")
        self.user_b = User.objects.create_user(username="userb", password="password")
        
        # Ensure UserStats exist
        UserStats.objects.get_or_create(user=self.user_a, duel_rating=1200)
        UserStats.objects.get_or_create(user=self.user_b, duel_rating=1200)

        # Seed some problems
        Problem.objects.create(
            title="Problem Easy",
            slug="prob-easy",
            description="Easy description",
            difficulty="easy",
            status="approved",
            is_active=True
        )
        Problem.objects.create(
            title="Problem Medium 1",
            slug="prob-med-1",
            description="Medium description 1",
            difficulty="medium",
            status="approved",
            is_active=True
        )
        Problem.objects.create(
            title="Problem Medium 2",
            slug="prob-med-2",
            description="Medium description 2",
            difficulty="medium",
            status="approved",
            is_active=True
        )
        Problem.objects.create(
            title="Problem Hard",
            slug="prob-hard",
            description="Hard description",
            difficulty="hard",
            status="approved",
            is_active=True
        )

    def test_create_duel_api(self):
        url = "/api/duels/create/"
        data = {
            "player_a_id": self.user_a.id,
            "player_b_id": self.user_b.id,
            "winner_id": self.user_a.id,
            "score_a": 300,
            "score_b": 150,
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("match_id", response.data)
        self.assertEqual(response.data["elo_delta_a"], 16)  # ELO change calculated
        self.assertEqual(response.data["elo_delta_b"], -16)

        # Confirm stats updated
        self.user_a.stats.refresh_from_db()
        self.user_b.stats.refresh_from_db()
        self.assertEqual(self.user_a.stats.duel_rating, 1216)
        self.assertEqual(self.user_b.stats.duel_rating, 1184)

    def test_duel_history_api(self):
        # Create a historical match
        DuelMatch.objects.create(
            player_a=self.user_a,
            player_b=self.user_b,
            winner=self.user_a,
            score_a=100,
            score_b=50,
            elo_delta_a=15,
            elo_delta_b=-15,
        )

        url = "/api/duels/history/"
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["opponent_name"], "userb")
        self.assertEqual(response.data[0]["result"], "Victory")

    def test_duel_problems_api(self):
        url = "/api/duels/problems/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 4)

        # Check distribution
        difficulties = [p["difficulty"] for p in response.data]
        self.assertEqual(difficulties.count("EASY"), 1)
        self.assertEqual(difficulties.count("MEDIUM"), 2)
        self.assertEqual(difficulties.count("HARD"), 1)
