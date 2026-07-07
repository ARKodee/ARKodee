import math
from django.utils import timezone
from apps.problems.models import Submission
from .models import ContestParticipant, ContestProblem


def calculate_contest_leaderboard(contest):
    """
    Calculates official finalized contest standings using the ACM-ICPC time penalty math engine.
    
    Formula per solved problem:
        Penalty = T_elapsed + (W * 20)
        - T_elapsed: Minutes from contest start_time to earliest ACCEPTED submission.
        - W: Number of failed submission attempts prior to the first ACCEPTED submission.
        - Unsolved problems add 0 penalty. Post-AC submissions add 0 penalty.
    
    Sort order:
        1. Highest Total Score (points) DESCENDING
        2. Lowest Penalty Minutes ASCENDING
    """
    participants = ContestParticipant.objects.filter(contest=contest).select_related("user")
    contest_problems = ContestProblem.objects.filter(contest=contest).select_related("problem").order_by("order_index")
    
    # Map problem letters ("A", "B", "C")
    prob_map = []
    for idx, cp in enumerate(contest_problems):
        letter = chr(65 + cp.order_index) if cp.order_index < 26 else str(cp.order_index)
        prob_map.append({
            "letter": letter,
            "problem": cp.problem,
            "points": cp.points
        })

    standings = []

    for p in participants:
        user = p.user
        user_total_score = 0
        user_total_penalty = 0
        problem_verdicts = {}

        # Fetch all submissions by user for this contest
        user_subs = Submission.objects.filter(
            contest=contest,
            user=user,
            submitted_at__gte=contest.start_time,
            submitted_at__lte=contest.end_time
        ).order_by("submitted_at")

        for item in prob_map:
            problem = item["problem"]
            letter = item["letter"]
            points = item["points"]

            # Filter submissions for this specific problem
            p_subs = [s for s in user_subs if s.problem_id == problem.id]

            # Find first ACCEPTED submission
            first_ac = None
            failed_count_before_ac = 0

            for sub in p_subs:
                if sub.verdict in ["AC", "accepted", "Accepted"]:
                    first_ac = sub
                    break
                elif sub.verdict in ["WA", "TLE", "RE", "CE", "MLE", "Wrong Answer", "Runtime Error"]:
                    failed_count_before_ac += 1

            if first_ac:
                # Calculate elapsed minutes from contest.start_time
                elapsed_seconds = (first_ac.submitted_at - contest.start_time).total_seconds()
                t_elapsed = max(0, int(elapsed_seconds // 60))
                
                # Penalty = Elapsed Minutes + (20 * Failed Attempts Before AC)
                prob_penalty = t_elapsed + (failed_count_before_ac * 20)
                
                user_total_score += points
                user_total_penalty += prob_penalty
                problem_verdicts[letter] = {
                    "status": "AC",
                    "attempts": failed_count_before_ac + 1,
                    "time": t_elapsed
                }
            elif len(p_subs) > 0:
                problem_verdicts[letter] = {
                    "status": "WA",
                    "attempts": len(p_subs),
                    "time": 0
                }
            else:
                problem_verdicts[letter] = {
                    "status": "UNSOLVED",
                    "attempts": 0,
                    "time": 0
                }

        standings.append({
            "participant_id": str(p.id),
            "username": user.username,
            "email": user.email,
            "total_score": user_total_score,
            "penalty_minutes": user_total_penalty,
            "elo_change": p.elo_change or 0,
            "problem_verdicts": problem_verdicts
        })

    # Sort standings: total_score DESCENDING, penalty_minutes ASCENDING
    standings.sort(key=lambda x: (-x["total_score"], x["penalty_minutes"]))

    # Inject rank index (1-based)
    for idx, entry in enumerate(standings):
        entry["rank"] = idx + 1

    return standings


def finalize_contest_and_calculate_elo(contest):
    """
    Finalizes the contest standings:
    1. Computes the ACM-ICPC standings (points, penalty minutes, rank).
    2. Persists the final total_score, penalty_minutes, and rank in ContestParticipant objects.
    3. Calculates ELO rating changes using a multiplayer ELO model.
    4. Persists the ELO changes to ContestParticipant.elo_change and updates UserStats.contest_rating.
    5. Marks the contest as finalized.
    """
    from apps.auth.models import UserStats
    
    # Calculate standings using the existing ICPC standings function
    standings = calculate_contest_leaderboard(contest)
    if not standings:
        contest.is_finalized = True
        contest.save()
        return
        
    N = len(standings)
    if N < 2:
        # If less than 2 participants, no ELO change calculation is needed, just save standings
        for entry in standings:
            p = ContestParticipant.objects.get(id=entry["participant_id"])
            p.total_score = entry["total_score"]
            p.penalty_minutes = entry["penalty_minutes"]
            p.rank = entry["rank"]
            p.elo_change = 0
            p.save()
        contest.is_finalized = True
        contest.save()
        return

    # Fetch initial ELO ratings from UserStats for all participants
    initial_ratings = {}
    participant_objs = {}
    for entry in standings:
        p = ContestParticipant.objects.select_related("user__stats").get(id=entry["participant_id"])
        participant_objs[entry["participant_id"]] = p
        
        # Ensure stats exist (safeguard)
        stats, created = UserStats.objects.get_or_create(user=p.user)
        initial_ratings[entry["participant_id"]] = stats.contest_rating

    # Multiplayer ELO calculation
    K_FACTOR = 32
    elo_changes = {pid: 0.0 for pid in initial_ratings}

    for i in range(N):
        pid_a = standings[i]["participant_id"]
        rank_a = standings[i]["rank"]
        rating_a = initial_ratings[pid_a]
        
        for j in range(N):
            if i == j:
                continue
            pid_b = standings[j]["participant_id"]
            rank_b = standings[j]["rank"]
            rating_b = initial_ratings[pid_b]
            
            # Expected outcome for A against B
            expected_a = 1.0 / (1.0 + math.pow(10.0, (rating_b - rating_a) / 400.0))
            
            # Actual outcome
            if rank_a < rank_b:
                actual_a = 1.0
            elif rank_a > rank_b:
                actual_a = 0.0
            else:
                actual_a = 0.5
                
            # Accumulate ELO change against B, normalized by N - 1
            elo_changes[pid_a] += (K_FACTOR / (N - 1)) * (actual_a - expected_a)

    # Persist ELO changes and update UserStats
    for entry in standings:
        pid = entry["participant_id"]
        p = participant_objs[pid]
        change = int(round(elo_changes[pid]))
        
        p.total_score = entry["total_score"]
        p.penalty_minutes = entry["penalty_minutes"]
        p.rank = entry["rank"]
        p.elo_change = change
        p.save()
        
        # Update UserStats
        user_stats = p.user.stats
        user_stats.contest_rating += change
        user_stats.save()

    contest.is_finalized = True
    contest.save()
