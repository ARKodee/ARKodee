from utils.mongo import get_collection

def save_problem_templates(problem_id, templates_dict):
    """
    Saves or updates multi-language boilerplate code templates for a problem in MongoDB.
    
    :param problem_id: UUID of the problem (string or UUID object)
    :param templates_dict: Dictionary mapping language names to boilerplate code strings
                           e.g., {'python': 'def solve():...', 'cpp': '...'}
    """
    collection = get_collection("problem_templates")
    collection.update_one(
        {"problem_id": str(problem_id)},
        {"$set": {"templates": templates_dict}},
        upsert=True
    )

def get_problem_templates(problem_id):
    """
    Retrieves boilerplate code templates for a problem from MongoDB.
    """
    collection = get_collection("problem_templates")
    doc = collection.find_one({"problem_id": str(problem_id)})
    if doc:
        return doc.get("templates", {})
    return {}
