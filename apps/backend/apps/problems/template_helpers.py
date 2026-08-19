from apps.problems.models import Problem

def save_problem_templates(problem_id, templates_dict):
    """
    Saves or updates multi-language boilerplate code templates for a problem in PostgreSQL.
    
    :param problem_id: UUID of the problem (string or UUID object)
    :param templates_dict: Dictionary mapping language names to boilerplate code strings
                           e.g., {'python': 'def solve():...', 'cpp': '...'}
    """
    Problem.objects.filter(id=problem_id).update(templates=templates_dict)

def get_problem_templates(problem_id):
    """
    Retrieves boilerplate code templates for a problem from PostgreSQL.
    """
    problem = Problem.objects.filter(id=problem_id).first()
    if problem:
        return problem.templates or {}
    return {}
