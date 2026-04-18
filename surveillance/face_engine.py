"""Legacy helper kept for compatibility. The active engine lives in ``main.py``."""

from __future__ import annotations

from typing import List, Optional

import cv2
import face_recognition
import numpy as np


def detect_and_recognize(
    frame: np.ndarray,
    known_encodings: List[np.ndarray],
    tolerance: float = 0.6,
) -> Optional[str]:
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    encodings = face_recognition.face_encodings(rgb)

    for encoding in encodings:
        if not known_encodings:
            path = "temp_unknown.jpg"
            cv2.imwrite(path, frame)
            return path
        matches = face_recognition.compare_faces(known_encodings, encoding, tolerance)
        if not any(matches):
            path = "temp_unknown.jpg"
            cv2.imwrite(path, frame)
            return path
    return None
