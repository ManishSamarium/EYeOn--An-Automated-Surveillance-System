import os
import time
from typing import Dict, List

# Global cache for user faces
USER_CACHE: Dict[str, Dict] = {}
CACHE_EXPIRY = 3600  # 1 hour

def cache_key_expired(user_id: str) -> bool:
    """Check if user cache has expired."""
    if user_id not in USER_CACHE:
        return True
    return (time.time() - USER_CACHE[user_id].get("timestamp", 0)) > CACHE_EXPIRY

def reload_user_cache(user_id: str, face_engine):
    """Reload the face cache for a user."""
    try:
        backend_url = os.getenv("BACKEND_URL", "http://127.0.0.1:5001")
        cache = face_engine.load_user_faces(user_id, backend_url)
        USER_CACHE[user_id] = {
            **cache,
            "timestamp": time.time()
        }
        return True
    except Exception as e:
        print(f"Error reloading cache for user {user_id}: {e}")
        return False

def get_user_cache(user_id: str, face_engine=None) -> Dict:
    """Get cache for user, reload if expired or missing."""
    if user_id not in USER_CACHE or (face_engine and cache_key_expired(user_id)):
        if face_engine:
            reload_user_cache(user_id, face_engine)
    
    return USER_CACHE.get(user_id, {"family_encodings": [], "category_encodings": {}})

def clear_user_cache(user_id: str):
    """Clear cache for a specific user."""
    if user_id in USER_CACHE:
        del USER_CACHE[user_id]

def clear_all_cache():
    """Clear all caches."""
    USER_CACHE.clear()

