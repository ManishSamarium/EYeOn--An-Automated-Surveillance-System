import face_recognition
import numpy as np
import cv2
import os
import time
from typing import Dict, List, Tuple, Optional

# Per-user face cache
FACE_CACHE: Dict[str, Dict] = {}

def load_user_faces(user_id: str, backend_url: str) -> Dict:
    """
    Load all known faces (family + categories) for a user.
    Returns dict with family_encodings and category_encodings.
    """
    try:
        import requests
        
        family_encodings = []
        category_encodings = {}
        
        # Get family members
        try:
            family_res = requests.get(
                f"{backend_url}/api/family/list",
                headers={"Authorization": f"Bearer system-token"},
                timeout=10
            )
            if family_res.status_code == 200:
                family_list = family_res.json()
                for member in family_list:
                    try:
                        image = face_recognition.load_image_file(member["imageUrl"])
                        encodings = face_recognition.face_encodings(image)
                        if encodings:
                            family_encodings.append({
                                "name": member.get("name", "Unknown"),
                                "encoding": encodings[0]
                            })
                    except Exception as e:
                        print(f"Error loading family member {member.get('name')}: {e}")
        except Exception as e:
            print(f"Error fetching family list: {e}")
        
        # Get categories (visitors)
        try:
            cat_res = requests.get(
                f"{backend_url}/api/category/list",
                headers={"Authorization": f"Bearer system-token"},
                timeout=10
            )
            if cat_res.status_code == 200:
                categories = cat_res.json()
                for cat in categories:
                    try:
                        image = face_recognition.load_image_file(cat["imageUrl"])
                        encodings = face_recognition.face_encodings(image)
                        if encodings:
                            cat_name = cat.get("name", "Unknown")
                            if cat_name not in category_encodings:
                                category_encodings[cat_name] = []
                            category_encodings[cat_name].append({
                                "encoding": encodings[0],
                                "description": cat.get("description", "")
                            })
                    except Exception as e:
                        print(f"Error loading category {cat.get('name')}: {e}")
        except Exception as e:
            print(f"Error fetching categories: {e}")
        
        # Cache the loaded data
        FACE_CACHE[user_id] = {
            "family_encodings": family_encodings,
            "category_encodings": category_encodings,
            "last_loaded": time.time()
        }
        
        print(f"Loaded {len(family_encodings)} family members and {len(category_encodings)} categories for user {user_id}")
        return FACE_CACHE[user_id]
    
    except Exception as e:
        print(f"Error loading user faces: {e}")
        return {"family_encodings": [], "category_encodings": {}}

def get_cached_faces(user_id: str) -> Dict:
    """Get cached faces for user, return empty if not cached."""
    return FACE_CACHE.get(user_id, {"family_encodings": [], "category_encodings": {}})

def recognize_face(
    face_encoding: np.ndarray,
    user_id: str,
    tolerance: float = 0.6
) -> Tuple[Optional[str], Optional[str]]:
    """
    Recognize a face.
    Returns: (type, name/category)
    type can be: 'family', 'category', or None (unknown)
    """
    cache = get_cached_faces(user_id)
    
    # Check family members
    for family_member in cache.get("family_encodings", []):
        distance = face_recognition.face_distance([family_member["encoding"]], face_encoding)[0]
        if distance < tolerance - 0.05:  # Lower threshold for family (0.55)
            return ("family", family_member["name"])
    
    # Check categories (visitors)
    for category_name, encodings in cache.get("category_encodings", {}).items():
        for item in encodings:
            distance = face_recognition.face_distance([item["encoding"]], face_encoding)[0]
            if distance < tolerance:  # 0.6 tolerance for categories
                return ("category", category_name)
    
    return (None, None)

def detect_faces_in_frame(frame: np.ndarray) -> List[Tuple[np.ndarray, Tuple]]:
    """
    Detect all faces in a frame.
    Returns: List of (encoding, location) tuples.
    """
    try:
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_frame)
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        return list(zip(face_encodings, face_locations))
    except Exception as e:
        print(f"Error detecting faces: {e}")
        return []

