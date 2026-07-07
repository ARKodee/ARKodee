from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.contests.models import Contest, ContestProblem, ContestParticipant
from apps.problems.models import Problem, Submission

User = get_user_model()


class ContestsApiTests(APITestCase):

    def setUp(self):
        self.user1 = User.objects.create_user(
            username="coder1",
            email="coder1@test.com",
            password="password123"
        )
        self.user2 = User.objects.create_user(
            username="coder2",
            email="coder2@test.com",
            password="password123"
        )
        self.client.force_authenticate(user=self.user1)

        now = timezone.now()
        self.contest = Contest.objects.create(
            title="Weekly Challenge #1",
            slug="weekly-challenge-1",
            description="Test contest description",
            type="public",
            scoring_mode="leetcode",
            start_time=now - timedelta(hours=2),
            end_time=now - timedelta(hours=1),
            status="approved"
        )

        self.problem_a = Problem.objects.create(
            title="Problem A",
            slug="problem-a",
            description="Solve A",
            difficulty="easy",
            status="approved"
        )

        self.contest_problem = ContestProblem.objects.create(
            contest=self.contest,
            problem=self.problem_a,
            points=100,
            order_index=0
        )

    def test_contests_list_api(self):
        url = reverse("contests:contests_list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)
        self.assertEqual(response.data[0]["slug"], "weekly-challenge-1")

    def test_contest_detail_api(self):
        url = reverse("contests:contest_detail", kwargs={"slug": "weekly-challenge-1"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Weekly Challenge #1")
        self.assertEqual(len(response.data["problems"]), 1)
        self.assertEqual(response.data["problems"][0]["order_index"], 0)

    def test_contest_register_api(self):
        url = reverse("contests:contest_register", kwargs={"slug": "weekly-challenge-1"})
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_registered"])
        self.assertTrue(ContestParticipant.objects.filter(contest=self.contest, user=self.user1).exists())

    def test_contest_start_virtual_api(self):
        url = reverse("contests:contest_start_virtual", kwargs={"slug": "weekly-challenge-1"})
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_virtual"])

    def test_contest_leaderboard_gated_when_active(self):
        # Create an active contest (not ended yet)
        now = timezone.now()
        active_contest = Contest.objects.create(
            title="Live Match",
            slug="live-match",
            start_time=now - timedelta(minutes=30),
            end_time=now + timedelta(minutes=30),
            status="approved"
        )
        url = reverse("contests:contest_leaderboard", kwargs={"slug": "live-match"})
        response = self.client.get(url)
        # Standings must be gated while active
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("published only after", response.data["detail"])

    def test_contest_leaderboard_acm_icpc_penalty_math_when_ended(self):
        # Register both users
        ContestParticipant.objects.create(contest=self.contest, user=self.user1)
        ContestParticipant.objects.create(contest=self.contest, user=self.user2)

        start = self.contest.start_time

        # User 1 submits 1 WA at start+10m, then 1 AC at start+20m
        sub1 = Submission.objects.create(
            contest=self.contest,
            user=self.user1,
            problem=self.problem_a,
            language="python",
            code="print(0)",
            verdict="WA"
        )
        Submission.objects.filter(id=sub1.id).update(submitted_at=start + timedelta(minutes=10))

        sub2 = Submission.objects.create(
            contest=self.contest,
            user=self.user1,
            problem=self.problem_a,
            language="python",
            code="print(1)",
            verdict="AC"
        )
        Submission.objects.filter(id=sub2.id).update(submitted_at=start + timedelta(minutes=20))

        # User 2 submits 1 AC directly at start+15m (0 failed attempts)
        sub3 = Submission.objects.create(
            contest=self.contest,
            user=self.user2,
            problem=self.problem_a,
            language="python",
            code="print(1)",
            verdict="AC"
        )
        Submission.objects.filter(id=sub3.id).update(submitted_at=start + timedelta(minutes=15))

        url = reverse("contests:contest_leaderboard", kwargs={"slug": "weekly-challenge-1"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

        # User 2 penalty = 15m + (0 * 20) = 15 mins. Rank 1.
        # User 1 penalty = 20m + (1 * 20) = 40 mins. Rank 2.
        user2_entry = response.data[0]
        user1_entry = response.data[1]

        self.assertEqual(user2_entry["username"], "coder2")
        self.assertEqual(user2_entry["rank"], 1)
        self.assertEqual(user2_entry["penalty_minutes"], 15)

        self.assertEqual(user1_entry["username"], "coder1")
        self.assertEqual(user1_entry["rank"], 2)
        self.assertEqual(user1_entry["penalty_minutes"], 40)

    def test_global_leaderboard_api(self):
        url = reverse("global_leaderboard_root")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) >= 1)
        self.assertIn("elo_rating", response.data[0])
