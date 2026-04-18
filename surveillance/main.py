"""EYeOn Surveillance FastAPI Service.

Runs a per-user camera loop in a background thread, performs face recognition
against family/category encodings fetched from the Node backend, and posts
unknown-face events back to the backend + sends Telegram alerts.
"""

from __future__ import annotations

import io
import logging
import os
import threading
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import cv2
import face_recognition
import numpy as np
import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("eyeon.surveillance")

NODE_BACKEND_URL = os.getenv("NODE_BACKEND_URL", "http://127.0.0.1:5001")
SYSTEM_TOKEN = os.getenv("SYSTEM_TOKEN", "system-internal-token")
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

FAMILY_TOLERANCE = float(os.getenv("FAMILY_TOLERANCE", "0.55"))
CATEGORY_TOLERANCE = float(os.getenv("CATEGORY_TOLERANCE", "0.6"))
UNKNOWN_COOLDOWN_SECONDS = int(os.getenv("UNKNOWN_COOLDOWN_SECONDS", "30"))
FRAME_SKIP = int(os.getenv("FRAME_SKIP", "2"))
CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "0"))


@dataclass
class UserState:
    user_id: str
    family_encodings: List[np.ndarray] = field(default_factory=list)
    family_names: List[str] = field(default_factory=list)
    category_encodings: List[np.ndarray] = field(default_factory=list)
    category_names: List[str] = field(default_factory=list)
    thread: Optional[threading.Thread] = None
    running: bool = False
    last_unknown_ts: float = 0.0
    last_category_alert: Dict[str, float] = field(default_factory=dict)


STATES: Dict[str, UserState] = {}
STATES_LOCK = threading.Lock()


def _get_state(user_id: str) -> UserState:
    with STATES_LOCK:
        state = STATES.get(user_id)
        if state is None:
            state = UserState(user_id=user_id)
            STATES[user_id] = state
        return state


def _download_image(url: str) -> Optional[np.ndarray]:
    try:
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        return face_recognition.load_image_file(io.BytesIO(resp.content))
    except Exception as exc:
        log.warning("Failed to download %s: %s", url, exc)
        return None


def _encode_items(items: List[dict]) -> tuple[List[np.ndarray], List[str]]:
    encodings: List[np.ndarray] = []
    names: List[str] = []
    for item in items:
        url = item.get("imageUrl")
        if not url:
            continue
        img = _download_image(url)
        if img is None:
            continue
        faces = face_recognition.face_encodings(img)
        if faces:
            encodings.append(faces[0])
            names.append(item.get("name", "unknown"))
    return encodings, names


def _load_user_encodings(state: UserState) -> None:
    headers = {"Authorization": f"Bearer {SYSTEM_TOKEN}"}
    try:
        fam_resp = requests.get(
            f"{NODE_BACKEND_URL}/api/internal/family/{state.user_id}",
            headers=headers,
            timeout=10,
        )
        cat_resp = requests.get(
            f"{NODE_BACKEND_URL}/api/internal/categories/{state.user_id}",
            headers=headers,
            timeout=10,
        )
        fam_resp.raise_for_status()
        cat_resp.raise_for_status()
    except Exception as exc:
        log.error("Failed to fetch encodings for %s: %s", state.user_id, exc)
        return

    state.family_encodings, state.family_names = _encode_items(fam_resp.json())
    state.category_encodings, state.category_names = _encode_items(cat_resp.json())
    log.info(
        "Loaded %d family and %d category encodings for user %s",
        len(state.family_encodings),
        len(state.category_encodings),
        state.user_id,
    )


def _send_telegram_photo(image_bytes: bytes, caption: str) -> None:
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendPhoto",
            data={"chat_id": TELEGRAM_CHAT_ID, "caption": caption},
            files={"photo": ("unknown.jpg", image_bytes, "image/jpeg")},
            timeout=10,
        )
    except Exception as exc:
        log.warning("Telegram alert failed: %s", exc)


def _send_telegram_message(text: str) -> None:
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage",
            data={"chat_id": TELEGRAM_CHAT_ID, "text": text},
            timeout=10,
        )
    except Exception as exc:
        log.warning("Telegram message failed: %s", exc)


def _post_unknown_event(user_id: str, image_bytes: bytes) -> None:
    try:
        requests.post(
            f"{NODE_BACKEND_URL}/api/fastapi/event",
            headers={"Authorization": f"Bearer {SYSTEM_TOKEN}"},
            files={"image": ("unknown.jpg", image_bytes, "image/jpeg")},
            data={"userId": user_id},
            timeout=10,
        )
    except Exception as exc:
        log.warning("Failed to post unknown event: %s", exc)


def _post_category_event(user_id: str, category_name: str) -> None:
    try:
        requests.post(
            f"{NODE_BACKEND_URL}/api/fastapi/category-event",
            headers={"Authorization": f"Bearer {SYSTEM_TOKEN}"},
            json={"userId": user_id, "categoryName": category_name},
            timeout=10,
        )
    except Exception as exc:
        log.warning("Failed to post category event: %s", exc)


def _classify(state: UserState, encoding: np.ndarray) -> tuple[str, Optional[str]]:
    if state.family_encodings:
        distances = face_recognition.face_distance(state.family_encodings, encoding)
        if distances.size and distances.min() < FAMILY_TOLERANCE:
            return "family", state.family_names[int(np.argmin(distances))]

    if state.category_encodings:
        distances = face_recognition.face_distance(state.category_encodings, encoding)
        if distances.size and distances.min() < CATEGORY_TOLERANCE:
            return "category", state.category_names[int(np.argmin(distances))]

    return "unknown", None


def _camera_loop(user_id: str) -> None:
    state = _get_state(user_id)
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        log.error("Cannot open webcam for user %s", user_id)
        state.running = False
        return

    log.info("Camera loop started for user %s", user_id)
    frame_idx = 0
    try:
        while state.running:
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.1)
                continue

            frame_idx += 1
            if frame_idx % FRAME_SKIP != 0:
                continue

            small = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
            rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
            face_locations = face_recognition.face_locations(rgb)
            if not face_locations:
                continue
            face_encs = face_recognition.face_encodings(rgb, face_locations)

            for encoding in face_encs:
                kind, name = _classify(state, encoding)

                if kind == "family":
                    continue

                if kind == "category" and name:
                    last = state.last_category_alert.get(name, 0.0)
                    if time.time() - last < UNKNOWN_COOLDOWN_SECONDS:
                        continue
                    state.last_category_alert[name] = time.time()
                    _send_telegram_message(f"Known category person arrived: {name}")
                    _post_category_event(user_id, name)
                    continue

                now = time.time()
                if now - state.last_unknown_ts < UNKNOWN_COOLDOWN_SECONDS:
                    continue
                state.last_unknown_ts = now

                ok, buffer = cv2.imencode(".jpg", frame)
                if not ok:
                    continue
                image_bytes = buffer.tobytes()

                _send_telegram_photo(image_bytes, "⚠️ Unknown person detected")
                _post_unknown_event(user_id, image_bytes)
    finally:
        cap.release()
        log.info("Camera loop stopped for user %s", user_id)


app = FastAPI(title="EYeOn Surveillance")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class EncodeRequest(BaseModel):
    userId: str
    image_url: str


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "active_users": [uid for uid, s in STATES.items() if s.running]}


@app.post("/reload/{user_id}")
def reload_user(user_id: str) -> dict:
    state = _get_state(user_id)
    _load_user_encodings(state)
    return {
        "ok": True,
        "family": len(state.family_encodings),
        "categories": len(state.category_encodings),
    }


@app.post("/start/{user_id}")
def start_surveillance(user_id: str) -> dict:
    state = _get_state(user_id)
    if state.running and state.thread and state.thread.is_alive():
        return {"started": True, "already_running": True}

    _load_user_encodings(state)
    state.running = True
    state.thread = threading.Thread(target=_camera_loop, args=(user_id,), daemon=True)
    state.thread.start()
    return {"started": True}


@app.post("/stop/{user_id}")
def stop_surveillance(user_id: str) -> dict:
    state = _get_state(user_id)
    state.running = False
    if state.thread:
        state.thread.join(timeout=5)
    state.thread = None
    return {"stopped": True}


@app.get("/status/{user_id}")
def status(user_id: str) -> dict:
    state = _get_state(user_id)
    return {
        "is_running": bool(state.running and state.thread and state.thread.is_alive()),
        "family_count": len(state.family_encodings),
        "category_count": len(state.category_encodings),
    }


@app.post("/encode")
def encode_from_url(payload: EncodeRequest) -> dict:
    state = _get_state(payload.userId)
    img = _download_image(payload.image_url)
    if img is None:
        raise HTTPException(status_code=400, detail="could not download image")
    faces = face_recognition.face_encodings(img)
    if not faces:
        raise HTTPException(status_code=400, detail="no face detected")
    state.family_encodings.append(faces[0])
    state.family_names.append(payload.userId)
    return {"success": True}


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("FASTAPI_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
