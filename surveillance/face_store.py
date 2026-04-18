"""Legacy helper kept for compatibility. The active engine lives in ``main.py``."""

from __future__ import annotations

import io
import os
from typing import Dict, List

import face_recognition
import numpy as np
import requests

NODE_BACKEND_URL = os.getenv("NODE_BACKEND_URL", "http://127.0.0.1:5001")
SYSTEM_TOKEN = os.getenv("SYSTEM_TOKEN", "system-internal-token")

_CACHE: Dict[str, List[np.ndarray]] = {}


def reload_encodings(user_id: str) -> List[np.ndarray]:
    headers = {"Authorization": f"Bearer {SYSTEM_TOKEN}"}
    try:
        resp = requests.get(
            f"{NODE_BACKEND_URL}/api/internal/family/{user_id}",
            headers=headers,
            timeout=10,
        )
        resp.raise_for_status()
        items = resp.json()
    except Exception:
        items = []

    encodings: List[np.ndarray] = []
    for item in items:
        url = item.get("imageUrl")
        if not url:
            continue
        try:
            image_bytes = requests.get(url, timeout=10).content
            image = face_recognition.load_image_file(io.BytesIO(image_bytes))
            faces = face_recognition.face_encodings(image)
            if faces:
                encodings.append(faces[0])
        except Exception:
            continue

    _CACHE[user_id] = encodings
    return encodings


def get_known_encodings(user_id: str) -> List[np.ndarray]:
    return _CACHE.get(user_id, [])
