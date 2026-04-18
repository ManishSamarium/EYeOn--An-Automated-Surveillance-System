"""Legacy helper kept for compatibility. The active engine lives in ``main.py``."""

from __future__ import annotations

import os
import threading
import time
from typing import Optional

import cv2
import requests

from face_engine import detect_and_recognize
from face_store import get_known_encodings, reload_encodings
from telegram import send_alert

NODE_URL = os.getenv("NODE_BACKEND_URL", "http://127.0.0.1:5001")
SYSTEM_TOKEN = os.getenv("SYSTEM_TOKEN", "system-internal-token")

_running = False
_thread: Optional[threading.Thread] = None


def _camera_loop(user_id: str) -> None:
    global _running
    cap = cv2.VideoCapture(0)
    reload_encodings(user_id)

    try:
        while _running:
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.1)
                continue

            known = get_known_encodings(user_id)
            unknown_path = detect_and_recognize(frame, known)
            if unknown_path:
                try:
                    send_alert(unknown_path)
                    with open(unknown_path, "rb") as fh:
                        requests.post(
                            f"{NODE_URL}/api/fastapi/event",
                            headers={"Authorization": f"Bearer {SYSTEM_TOKEN}"},
                            files={"image": fh},
                            data={"userId": user_id},
                            timeout=10,
                        )
                except Exception:
                    pass
                time.sleep(10)
    finally:
        cap.release()


def start_camera(user_id: str) -> None:
    global _running, _thread
    if _running:
        return
    _running = True
    _thread = threading.Thread(target=_camera_loop, args=(user_id,), daemon=True)
    _thread.start()


def stop_camera() -> None:
    global _running
    _running = False
