"""
Utility functions for profile data aggregation and calculations.
"""
from django.db.models import Count, Q
from django.contrib.auth.models import User
from apps.problems.models import UserProblemStats, Submission
from apps.contests.models import ContestParticipant


def get_user_problem_stats(user: User) -> dict:
    """
    Aggregates user's problem statistics by difficulty level.
    
    Returns aggregated data:
    - Total solved/attempted by difficulty (Easy/Medium/Hard)
    - Overall success rate
    
    Args:
        user: Django User instance
        
    Returns:
        dict: Problem statistics breakdown by difficulty
    """
    problem_stats = UserProblemStats.objects.filter(user=user).select_related('problem')
    
    stats_by_difficulty = {
        'easy': {'solved': 0, 'attempted': 0},
        'medium': {'solved': 0, 'attempted': 0},
        'hard': {'solved': 0, 'attempted': 0},
    }
    
    total_solved = 0
    total_attempted = 0
    
    for stat in problem_stats:
        difficulty = stat.problem.difficulty.lower()
        
        if stat.status == 'solved':
            stats_by_difficulty[difficulty]['solved'] += 1
            total_solved += 1
        else:
            stats_by_difficulty[difficulty]['attempted'] += 1
            total_attempted += 1
    
    # Calculate success rate
    total_attempts = total_solved + total_attempted
    success_rate = (total_solved / total_attempts * 100) if total_attempts > 0 else 0
    
    return {
        'by_difficulty': stats_by_difficulty,
        'total_solved': total_solved,
        'total_attempted': total_attempted,
        'success_rate': round(success_rate, 2),
    }


def get_user_recent_activity(user: User, limit: int = 5) -> dict:
    """
    Fetches user's recent activity including submissions and contests.
    
    Args:
        user: Django User instance
        limit: Maximum number of items to return (default: 5)
        
    Returns:
        dict: Recent submissions and contest participations
    """
    # Get recent submissions so the UI reflects the user's actual activity mix.
    recent_submissions = (
        Submission.objects
        .filter(user=user)
        .select_related('problem')
        .order_by('-submitted_at')[:limit]
    )
    
    submissions_data = [
        {
            'id': str(sub.id),
            'problem_title': sub.problem.title,
            'problem_slug': sub.problem.slug,
            'language': sub.language,
            'verdict': sub.verdict,
            'runtime_ms': sub.runtime_ms,
            'submitted_at': sub.submitted_at.isoformat(),
        }
        for sub in recent_submissions
    ]
    
    # Get recent contest participations
    recent_contests = (
        ContestParticipant.objects
        .filter(user=user)
        .select_related('contest')
        .order_by('-joined_at')[:limit]
    )
    
    contests_data = [
        {
            'id': str(cp.id),
            'contest_title': cp.contest.title,
            'contest_slug': cp.contest.slug,
            'rank': cp.rank,
            'total_score': cp.total_score,
            'elo_change': cp.elo_change,
            'joined_at': cp.joined_at.isoformat(),
        }
        for cp in recent_contests
    ]
    
    return {
        'recent_submissions': submissions_data,
        'recent_contests': contests_data,
    }


def get_contest_stats(user: User) -> dict:
    """
    Aggregates user's contest performance statistics.
    
    Args:
        user: Django User instance
        
    Returns:
        dict: Contest performance metrics
    """
    contest_data = ContestParticipant.objects.filter(user=user)
    
    total_contests = contest_data.count()
    ranked_contests = contest_data.filter(rank__isnull=False)
    best_rank = ranked_contests.order_by('rank').values_list('rank', flat=True).first()
    
    # Calculate average score and ELO change
    avg_score = 0
    total_elo_change = 0
    
    if total_contests > 0:
        avg_score = sum(cp.total_score for cp in contest_data) / total_contests
        total_elo_change = sum(cp.elo_change or 0 for cp in contest_data)
    
    return {
        'total_contests': total_contests,
        'best_rank': best_rank,
        'average_score': round(avg_score, 2),
        'total_elo_change': total_elo_change,
    }


def get_user_language_stats(user: User) -> dict:
    """
    Calculates which programming languages the user has used most.
    
    Args:
        user: Django User instance
        
    Returns:
        dict: Language usage frequency (top 5)
    """
    language_stats = (
        Submission.objects
        .filter(user=user, verdict='AC')
        .values('language')
        .annotate(count=Count('language'))
        .order_by('-count')[:5]
    )
    
    return {
        'languages': [
            {'name': stat['language'], 'count': stat['count']}
            for stat in language_stats
        ]
    }


def get_user_tag_stats(user: User) -> dict:
    """
    Calculates which problem tags the user has solved most.
    
    Args:
        user: Django User instance
        
    Returns:
        dict: Top 5 problem tags by solve count
    """
    from apps.problems.models import Tag
    
    # Get tags from solved problems
    tag_stats = (
        Tag.objects
        .filter(problems__user_stats__user=user, problems__user_stats__status='solved')
        .annotate(solved_count=Count('problems', filter=Q(problems__user_stats__status='solved')))
        .order_by('-solved_count')[:5]
    )
    
    return {
        'tags': [
            {'name': tag.name, 'solved_count': tag.solved_count}
            for tag in tag_stats
        ]
    }
