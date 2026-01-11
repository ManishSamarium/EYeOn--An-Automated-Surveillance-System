import cv2, time, threading, os, requests
from face_engine import detect_and_recognize
from telegram import send_alert

NODE_URL = os.getenv("NODE_BACKEND_URL")
_running = False
_thread = None

def _camera_loop(user_id):
    global _running
    cap = cv2.VideoCapture(0)

    while _running:
        ret, frame = cap.read()
        if not ret:
            continue

        unknown = detect_and_recognize(frame, user_id)
        if unknown:
            send_alert(unknown)

            if NODE_URL:
                requests.post(f"{NODE_URL}/api/fastapi/event",
                              files={"image": open(unknown, "rb")},
                              data={"userId": user_id})

            time.sleep(10)

    cap.release()

def start_camera(user_id):
    global _running, _thread
    if _running:
        return

    _running = True
    _thread = threading.Thread(target=_camera_loop, args=(user_id,), daemon=True)
    _thread.start()

def stop_camera():
    global _running
    _running = False
