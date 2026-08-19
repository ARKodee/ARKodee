"""
Utility functions for profile data aggregation and calculations.
"""
from django.db.models import Count, Q, Avg, Sum
from django.contrib.auth.models import User
from apps.problems.models import UserProblemStats, Submission
from apps.contests.models import ContestParticipant


def get_user_problem_stats(user: User) -> dict:
    """
    Aggregates user's problem statistics by difficulty level using efficient database values.
    """
    stats_qs = UserProblemStats.objects.filter(user=user).select_related('problem').only('status', 'problem__difficulty')
    
    stats_by_difficulty = {
        'easy': {'solved': 0, 'attempted': 0},
        'medium': {'solved': 0, 'attempted': 0},
        'hard': {'solved': 0, 'attempted': 0},
    }
    
    total_solved = 0
    total_attempted = 0
    
    for stat in stats_qs:
        difficulty = (stat.problem.difficulty or 'easy').lower()
        if difficulty not in stats_by_difficulty:
            difficulty = 'easy'
        
        if stat.status == 'solved':
            stats_by_difficulty[difficulty]['solved'] += 1
            total_solved += 1
        else:
            stats_by_difficulty[difficulty]['attempted'] += 1
            total_attempted += 1
    
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
    """
    recent_submissions = (
        Submission.objects
        .filter(user=user)
        .select_related('problem')
        .only('id', 'problem__title', 'problem__slug', 'language', 'verdict', 'runtime_ms', 'submitted_at')
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
    
    recent_contests = (
        ContestParticipant.objects
        .filter(user=user)
        .select_related('contest')
        .only('id', 'contest__title', 'contest__slug', 'rank', 'total_score', 'elo_change', 'joined_at')
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
    Aggregates user's contest performance statistics via SQL aggregates.
    """
    contest_qs = ContestParticipant.objects.filter(user=user)
    agg = contest_qs.aggregate(
        total_contests=Count('id'),
        avg_score=Avg('total_score'),
        total_elo_change=Sum('elo_change')
    )
    
    total_contests = agg['total_contests'] or 0
    best_rank = contest_qs.filter(rank__isnull=False).order_by('rank').values_list('rank', flat=True).first()
    
    return {
        'total_contests': total_contests,
        'best_rank': best_rank,
        'average_score': round(agg['avg_score'] or 0, 2),
        'total_elo_change': agg['total_elo_change'] or 0,
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
