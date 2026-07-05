import pymongo
from django.conf import settings

_mongo_client = None

def get_mongo_client():
    """
    Returns a cached PyMongo client instance.
    """
    global _mongo_client
    if _mongo_client is None:
        # Use settings.MONGODB_URI if defined, fallback to localhost
        uri = getattr(settings, "MONGODB_URI", "mongodb://localhost:27017")
        _mongo_client = pymongo.MongoClient(uri)
    return _mongo_client

def get_mongo_db():
    """
    Returns the default MongoDB database instance configured in settings.
    """
    client = get_mongo_client()
    db_name = getattr(settings, "MONGODB_DB_NAME", "arkodee")
    return client[db_name]

def get_collection(collection_name):
    """
    Helper to get a specific MongoDB collection.
    """
    db = get_mongo_db()
    return db[collection_name]
