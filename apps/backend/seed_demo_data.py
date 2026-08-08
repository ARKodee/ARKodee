import os
import sys
import django
import datetime
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password

# Setup django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.auth.models import UserStats
from apps.problems.models import Problem, Submission
from apps.contests.models import Contest, ContestProblem, ContestParticipant
from apps.duels.models import DuelMatch

def seed_all():
    print("Starting database clean & demo seeding...")
    User = get_user_model()
    
    # 1. Create/Update at least 9 Users (including both niharkakani and niharkakani21)
    user_configs = [
        {
            "username": "niharkakani",
            "email": "niharkakani@gmail.com",
            "fullName": "Nihar Kakani",
            "is_superuser": False,
            "is_staff": False,
            "role": "player",
            "contest_rating": 2150,
            "duel_rating": 1850,
            "streak": 15,
            "wins": 14,
            "losses": 5,
            "draws": 3
        },
        {
            "username": "niharkakani21",
            "email": "nihar21@arkodee.com",
            "fullName": "Nihar Kakani (Demo)",
            "is_superuser": True,
            "is_staff": True,
            "role": "superadmin",
            "contest_rating": 2150,
            "duel_rating": 1850,
            "streak": 15,
            "wins": 14,
            "losses": 5,
            "draws": 3
        },
        {
            "username": "alex_grandmaster",
            "email": "alex@arkodee.com",
            "fullName": "Alex Rivera",
            "is_superuser": False,
            "is_staff": False,
            "role": "player",
            "contest_rating": 2300,
            "duel_rating": 1920,
            "streak": 28,
            "wins": 22,
            "losses": 8,
            "draws": 4
        },
        {
            "username": "sarah_expert",
            "email": "sarah@arkodee.com",
            "fullName": "Sarah Chen",
            "is_superuser": False,
            "is_staff": False,
            "role": "player",
            "contest_rating": 1720,
            "duel_rating": 1550,
            "streak": 9,
            "wins": 8,
            "losses": 7,
            "draws": 2
        },
        {
            "username": "david_master",
            "email": "david@arkodee.com",
            "fullName": "David Kovacs",
            "is_superuser": False,
            "is_staff": False,
            "role": "player",
            "contest_rating": 2050,
            "duel_rating": 1790,
            "streak": 20,
            "wins": 16,
            "losses": 11,
            "draws": 5
        },
        {
            "username": "marcus_specialist",
            "email": "marcus@arkodee.com",
            "fullName": "Marcus Aurelius",
            "is_superuser": False,
            "is_staff": False,
            "role": "player",
            "contest_rating": 1480,
            "duel_rating": 1410,
            "streak": 12,
            "wins": 11,
            "losses": 9,
            "draws": 3
        },
        {
            "username": "emily_pupil",
            "email": "emily@arkodee.com",
            "fullName": "Emily Watson",
            "is_superuser": False,
            "is_staff": False,
            "role": "player",
            "contest_rating": 1320,
            "duel_rating": 1210,
            "streak": 5,
            "wins": 5,
            "losses": 8,
            "draws": 2
        },
        {
            "username": "john_pupil",
            "email": "john@arkodee.com",
            "fullName": "John Doe",
            "is_superuser": False,
            "is_staff": False,
            "role": "player",
            "contest_rating": 1250,
            "duel_rating": 1180,
            "streak": 4,
            "wins": 3,
            "losses": 6,
            "draws": 1
        },
        {
            "username": "sophia_newbie",
            "email": "sophia@arkodee.com",
            "fullName": "Sophia Martinez",
            "is_superuser": False,
            "is_staff": False,
            "role": "player",
            "contest_rating": 980,
            "duel_rating": 950,
            "streak": 2,
            "wins": 1,
            "losses": 5,
            "draws": 0
        }
    ]
    
    user_instances = {}
    for conf in user_configs:
        user, created = User.objects.get_or_create(
            username=conf["username"],
            defaults={
                "email": conf["email"],
                "password": make_password("Password@123"),
                "is_active": True,
                "is_superuser": conf["is_superuser"],
                "is_staff": conf["is_staff"]
            }
        )
        if not created:
            user.email = conf["email"]
            # Only update password for non-gmail accounts to prevent breaking google auth keys
            if not conf["email"].endswith("@gmail.com"):
                user.password = make_password("Password@123")
            user.is_superuser = conf["is_superuser"]
            user.is_staff = conf["is_staff"]
            user.save()
            
        user_instances[conf["username"]] = user
        print(f"User {user.username} is ready.")
        
        # Seed statistics
        stats, _ = UserStats.objects.get_or_create(user=user)
        stats.contest_rating = conf["contest_rating"]
        stats.duel_rating = conf["duel_rating"]
        stats.streak = conf["streak"]
        stats.total_wins = conf["wins"]
        stats.total_losses = conf["losses"]
        stats.total_draws = conf["draws"]
        stats.role = conf["role"] # Update stats role field if it exists
        stats.avatar_url = f"https://api.dicebear.com/7.x/bottts/svg?seed={user.username}"
        stats.save()
        print(f"Stats updated for {user.username}: Contest Rating: {stats.contest_rating}, Duel Rating: {stats.duel_rating}")

    # 2. Re-create Contests (Clean testing data)
    print("Clearing old contest data...")
    Contest.objects.all().delete()
    
    now = timezone.now()
    
    past_contest_1 = Contest.objects.create(
        title="October Week 1 Major Rated Contest",
        slug="october-week-1-major-rated-contest",
        description="The opening major rated contest of October 2026. Showcase your coding speeds and logic correctness.",
        type="public",
        scoring_mode="leetcode",
        start_time=now - datetime.timedelta(days=7),
        end_time=now - datetime.timedelta(days=7, hours=-2),
        is_rated=True,
        is_finalized=True,
        status="approved"
    )
    print("Past contest 1 created.")
    
    past_contest_2 = Contest.objects.create(
        title="September Autumn Clash 2026",
        slug="september-autumn-clash-2026",
        description="The competitive autumn challenge. Compete for major rating boosts.",
        type="public",
        scoring_mode="codeforces",
        start_time=now - datetime.timedelta(days=20),
        end_time=now - datetime.timedelta(days=20, hours=-3),
        is_rated=True,
        is_finalized=True,
        status="approved"
    )
    print("Past contest 2 created.")
    
    ongoing_contest = Contest.objects.create(
        title="ARKodee Weekly Code Duel 45",
        slug="arkodee-weekly-code-duel-45",
        description="Join code duel 45 live now! Compete against other players to climb the leaderboards.",
        type="public",
        scoring_mode="codeforces",
        start_time=now - datetime.timedelta(minutes=30),
        end_time=now + datetime.timedelta(hours=1, minutes=30),
        is_rated=True,
        is_finalized=False,
        status="approved"
    )
    print("Ongoing contest created.")
    
    future_contest = Contest.objects.create(
        title="ARKodee Grand Championship 2026",
        slug="arkodee-grand-championship-2026",
        description="The ultimate annual championship tournament for the top ARKodee developers. Rated: Open for all.",
        type="public",
        scoring_mode="leetcode",
        start_time=now + datetime.timedelta(days=2),
        end_time=now + datetime.timedelta(days=2, hours=3),
        is_rated=True,
        is_finalized=False,
        status="approved"
    )
    print("Future contest created.")

    # 3. Link existing problems to contests
    problems = list(Problem.objects.all()[:4])
    if not problems:
        print("WARNING: No problems found in database! Creating fake problems for contests...")
        # Create fallback problems if none exist
        prob1 = Problem.objects.create(
            title="Two Sum Test", slug="two-sum-test", description="Find two numbers that add up to target.",
            difficulty="easy", constraints="N <= 10^5", time_limit_ms=1000, memory_limit_mb=256
        )
        prob2 = Problem.objects.create(
            title="Move Zeroes Test", slug="move-zeroes-test", description="Move all zeroes to the end.",
            difficulty="easy", constraints="N <= 10^5", time_limit_ms=1000, memory_limit_mb=256
        )
        problems = [prob1, prob2]
        
    for idx, prob in enumerate(problems):
        for c in [past_contest_1, past_contest_2, ongoing_contest, future_contest]:
            ContestProblem.objects.get_or_create(
                contest=c,
                problem=prob,
                defaults={"points": 100, "order_index": idx}
            )
    print(f"Problems mapped to contests successfully.")

    # 4. Create Contest Participant records & award winner badges for both profiles
    for user_key in ["niharkakani", "niharkakani21"]:
        ContestParticipant.objects.create(
            contest=past_contest_1,
            user=user_instances[user_key],
            rank=1,
            total_score=400,
            penalty_minutes=18,
            elo_change=85
        )
        ContestParticipant.objects.create(
            contest=past_contest_2,
            user=user_instances[user_key],
            rank=3,
            total_score=450,
            penalty_minutes=29,
            elo_change=30
        )
        
    ContestParticipant.objects.create(
        contest=past_contest_1,
        user=user_instances["alex_grandmaster"],
        rank=2,
        total_score=380,
        penalty_minutes=25,
        elo_change=45
    )
    ContestParticipant.objects.create(
        contest=past_contest_1,
        user=user_instances["sarah_expert"],
        rank=15,
        total_score=150,
        penalty_minutes=72,
        elo_change=-20
    )
    
    ContestParticipant.objects.create(
        contest=past_contest_2,
        user=user_instances["alex_grandmaster"],
        rank=1,
        total_score=500,
        penalty_minutes=14,
        elo_change=95
    )
    ContestParticipant.objects.create(
        contest=past_contest_2,
        user=user_instances["david_master"],
        rank=5,
        total_score=400,
        penalty_minutes=35,
        elo_change=15
    )
    
    print("Contest participant records and Champion badges seeded successfully.")

    # 5. Create DuelMatch History Records (Win/Loss/Draw)
    print("Clearing old duel matches...")
    DuelMatch.objects.all().delete()
    
    # Seed matches for BOTH niharkakani and niharkakani21
    for user_key in ["niharkakani", "niharkakani21"]:
        # vs alex_grandmaster - Wins, Losses, Draws
        DuelMatch.objects.create(
            player_a=user_instances[user_key],
            player_b=user_instances["alex_grandmaster"],
            winner=user_instances[user_key],
            score_a=4,
            score_b=2,
            elo_delta_a=18,
            elo_delta_b=-18
        )
        DuelMatch.objects.create(
            player_a=user_instances[user_key],
            player_b=user_instances["alex_grandmaster"],
            winner=user_instances["alex_grandmaster"],
            score_a=1,
            score_b=3,
            elo_delta_a=-16,
            elo_delta_b=16
        )
        DuelMatch.objects.create(
            player_a=user_instances[user_key],
            player_b=user_instances["alex_grandmaster"],
            winner=None, # Draw
            score_a=2,
            score_b=2,
            elo_delta_a=2,
            elo_delta_b=2
        )
        
        # vs sarah_expert - Win
        DuelMatch.objects.create(
            player_a=user_instances[user_key],
            player_b=user_instances["sarah_expert"],
            winner=user_instances[user_key],
            score_a=3,
            score_b=0,
            elo_delta_a=14,
            elo_delta_b=-14
        )
    
    # david_master vs marcus_specialist - Wins
    DuelMatch.objects.create(
        player_a=user_instances["david_master"],
        player_b=user_instances["marcus_specialist"],
        winner=user_instances["david_master"],
        score_a=4,
        score_b=1,
        elo_delta_a=12,
        elo_delta_b=-12
    )
    
    # emily_pupil vs john_pupil - Draw
    DuelMatch.objects.create(
        player_a=user_instances["emily_pupil"],
        player_b=user_instances["john_pupil"],
        winner=None,
        score_a=2,
        score_b=2,
        elo_delta_a=1,
        elo_delta_b=1
    )
    
    # john_pupil vs sophia_newbie - Win
    DuelMatch.objects.create(
        player_a=user_instances["john_pupil"],
        player_b=user_instances["sophia_newbie"],
        winner=user_instances["john_pupil"],
        score_a=3,
        score_b=1,
        elo_delta_a=15,
        elo_delta_b=-15
    )
    print("Duel history matching seeded successfully.")

    # 6. Seed Submissions (verdicts & language frequencies)
    print("Seeding submissions for analytics mapping...")
    Submission.objects.all().delete()
    
    langs = ["python", "javascript", "java", "cpp"]
    verdicts = ["AC", "AC", "AC", "WA", "RE"]
    
    for user_name, user in user_instances.items():
        # Add 10-15 mock submissions to simulate real activity heatmap and language breakdowns
        for i in range(12):
            lang = langs[i % len(langs)]
            verd = verdicts[i % len(verdicts)]
            prob = problems[i % len(problems)]
            
            Submission.objects.create(
                user=user,
                problem=prob,
                language=lang,
                code=f"// Submission code for {prob.title}\nclass Solution {{ }}",
                verdict=verd,
                runtime_ms=80 + (i * 12),
                memory_used_mb=24 + (i * 2),
                test_cases_passed=10 if verd == "AC" else 3,
                total_test_cases=10,
                submitted_at=timezone.now() - datetime.timedelta(days=i, hours=i % 6)
            )
            
    print("Database seeding completed successfully! All entities are ready.")

if __name__ == "__main__":
    seed_all()
