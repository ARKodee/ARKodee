from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.contests.models import Contest, ContestProblem, ContestParticipant
from apps.problems.models import Problem, Submission

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds database with sample live, upcoming, past, and private contests connected to real problems."

    def handle(self, *args, **options):
        now = timezone.now()

        # 1. Fetch real problems from problem table
        prob_good_pairs = Problem.objects.filter(slug="find-the-number-of-good-pairs-i").first()
        prob_compression = Problem.objects.filter(slug="string-compression-iii").first()
        prob_chairs = Problem.objects.filter(slug="minimum-number-of-chairs-in-a-waiting-room").first()
        prob_meetings = Problem.objects.filter(slug="count-days-without-meetings").first()
        prob_child = Problem.objects.filter(slug="find-the-child-who-has-the-ball-after-k-seconds").first()

        # Fallback if specific problems don't exist
        all_probs = list(Problem.objects.filter(status="approved")[:5])
        if not all_probs:
            self.stdout.write(self.style.ERROR("No approved problems found! Please seed problems first."))
            return

        p1 = prob_good_pairs or all_probs[0]
        p2 = prob_compression or (all_probs[1] if len(all_probs) > 1 else all_probs[0])
        p3 = prob_chairs or (all_probs[2] if len(all_probs) > 2 else all_probs[0])
        p4 = prob_meetings or (all_probs[3] if len(all_probs) > 3 else all_probs[0])
        p5 = prob_child or (all_probs[4] if len(all_probs) > 4 else all_probs[0])

        # 2. Fetch existing users
        users = {u.username: u for u in User.objects.all()}
        
        user_nihar = users.get("nihar") or users.get("niharkakani@gmail.com")
        user_dharmil = users.get("dharmil132@gmail.com")
        user_rusti = users.get("patelsrusti455@gmail.com")
        user_lnvk = users.get("lnvk@gmail.com")

        if not user_nihar:
            self.stdout.write(self.style.WARNING("User 'nihar' not found. Seeding with available users."))

        # Clear existing contests to start clean
        ContestParticipant.objects.all().delete()
        ContestProblem.objects.all().delete()
        Contest.objects.all().delete()

        # 3. Create Contests
        c_live = Contest.objects.create(
            title="Weekly Challenge #42 — Data Structures Edition",
            slug="weekly-challenge-42",
            description="Put your data structures knowledge to the test! Features problems covering arrays, hash maps, linked lists, and caches. Solve A, B, and C as fast as possible.",
            type="public",
            scoring_mode="leetcode",
            start_time=now - timedelta(minutes=30),
            end_time=now + timedelta(hours=2),
            is_rated=True,
            status="approved"
        )
        
        c_upcoming = Contest.objects.create(
            title="Monthly Contest — July 2026",
            slug="monthly-contest-july",
            description="The flagship monthly contest! A balanced mix of problems across all difficulty levels. Top performers earn rating boosts and competitive badges.",
            type="public",
            scoring_mode="leetcode",
            start_time=now + timedelta(days=2),
            end_time=now + timedelta(days=2, hours=2),
            is_rated=True,
            status="approved"
        )

        c_past = Contest.objects.create(
            title="Weekly Challenge #41 — Basic Array Computations",
            slug="weekly-challenge-41",
            description="Practice challenge focusing on array operations, string mappings, and modular computations. Simulated virtual match practice enabled.",
            type="public",
            scoring_mode="codeforces",
            start_time=now - timedelta(days=2),
            end_time=now - timedelta(days=2, hours=-2),
            is_rated=True,
            status="approved"
        )

        c_private = Contest.objects.create(
            title="DP Deep Dive — Classroom Private Exam",
            slug="dp-deep-dive",
            description="Private classroom contest focused entirely on dynamic programming techniques. Requires PIN code '1234' to unlock and register.",
            type="private",
            access_code="1234",
            scoring_mode="leetcode",
            start_time=now + timedelta(days=1),
            end_time=now + timedelta(days=1, hours=2),
            is_rated=False,
            status="approved"
        )

        # 4. Link Problems
        ContestProblem.objects.create(contest=c_live, problem=p1, points=100, order_index=0)
        ContestProblem.objects.create(contest=c_live, problem=p2, points=200, order_index=1)
        ContestProblem.objects.create(contest=c_live, problem=p3, points=300, order_index=2)

        ContestProblem.objects.create(contest=c_upcoming, problem=p4, points=100, order_index=0)
        ContestProblem.objects.create(contest=c_upcoming, problem=p5, points=250, order_index=1)

        ContestProblem.objects.create(contest=c_past, problem=p1, points=100, order_index=0)
        ContestProblem.objects.create(contest=c_past, problem=p5, points=200, order_index=1)

        ContestProblem.objects.create(contest=c_private, problem=p2, points=100, order_index=0)
        ContestProblem.objects.create(contest=c_private, problem=p4, points=200, order_index=1)

        # 5. Register Live Participants
        for u in [user_nihar, user_dharmil, user_rusti]:
            if u:
                ContestParticipant.objects.create(contest=c_live, user=u)

        # 6. Register Past Participants & Create Submissions for ICPC leaderboards calculation
        past_users = [user_nihar, user_dharmil, user_rusti, user_lnvk]
        for u in past_users:
            if u:
                ContestParticipant.objects.create(contest=c_past, user=u)

        # Clear old contest submissions for clean leaderboard
        Submission.objects.filter(contest=c_past).delete()

        # User: dharmil132@gmail.com
        # Solved P1 (A) at start+10m, P2 (B) at start+25m. Score = 300.
        if user_dharmil:
            sub1 = Submission.objects.create(
                contest=c_past,
                user=user_dharmil,
                problem=p1,
                language="python",
                code="def solve(): pass",
                verdict="AC",
                test_cases_passed=5,
                total_test_cases=5
            )
            Submission.objects.filter(id=sub1.id).update(submitted_at=c_past.start_time + timedelta(minutes=10))

            sub2 = Submission.objects.create(
                contest=c_past,
                user=user_dharmil,
                problem=p5,
                language="python",
                code="def solve(): pass",
                verdict="AC",
                test_cases_passed=5,
                total_test_cases=5
            )
            Submission.objects.filter(id=sub2.id).update(submitted_at=c_past.start_time + timedelta(minutes=25))

        # User: nihar (or niharkakani@gmail.com)
        # Solved P1 (A) at start+15m, P2 (B) at start+45m (with 1 prior WA). Score = 300.
        if user_nihar:
            sub3 = Submission.objects.create(
                contest=c_past,
                user=user_nihar,
                problem=p1,
                language="python",
                code="def solve(): pass",
                verdict="AC",
                test_cases_passed=5,
                total_test_cases=5
            )
            Submission.objects.filter(id=sub3.id).update(submitted_at=c_past.start_time + timedelta(minutes=15))

            # Prior WA
            sub4 = Submission.objects.create(
                contest=c_past,
                user=user_nihar,
                problem=p5,
                language="python",
                code="def solve(): pass",
                verdict="WA",
                test_cases_passed=2,
                total_test_cases=5
            )
            Submission.objects.filter(id=sub4.id).update(submitted_at=c_past.start_time + timedelta(minutes=30))

            # Final AC
            sub5 = Submission.objects.create(
                contest=c_past,
                user=user_nihar,
                problem=p5,
                language="python",
                code="def solve(): pass",
                verdict="AC",
                test_cases_passed=5,
                total_test_cases=5
            )
            Submission.objects.filter(id=sub5.id).update(submitted_at=c_past.start_time + timedelta(minutes=45))

        # User: patelsrusti455@gmail.com
        # Solved P1 (A) at start+20m (with 2 prior WA). Score = 100.
        if user_rusti:
            # Prior WA 1
            sub6 = Submission.objects.create(
                contest=c_past,
                user=user_rusti,
                problem=p1,
                language="python",
                code="def solve(): pass",
                verdict="WA",
                test_cases_passed=1,
                total_test_cases=5
            )
            Submission.objects.filter(id=sub6.id).update(submitted_at=c_past.start_time + timedelta(minutes=5))

            # Prior WA 2
            sub7 = Submission.objects.create(
                contest=c_past,
                user=user_rusti,
                problem=p1,
                language="python",
                code="def solve(): pass",
                verdict="TLE",
                test_cases_passed=2,
                total_test_cases=5
            )
            Submission.objects.filter(id=sub7.id).update(submitted_at=c_past.start_time + timedelta(minutes=12))

            # Final AC
            sub8 = Submission.objects.create(
                contest=c_past,
                user=user_rusti,
                problem=p1,
                language="python",
                code="def solve(): pass",
                verdict="AC",
                test_cases_passed=5,
                total_test_cases=5
            )
            Submission.objects.filter(id=sub8.id).update(submitted_at=c_past.start_time + timedelta(minutes=20))

        self.stdout.write(
            self.style.SUCCESS("Successfully seeded contest data connected to real problems and created standings!")
        )
