from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from datetime import datetime
from dotenv import load_dotenv
import asyncio
import httpx
import json
import random
import cv2
import io
import numpy as np
import json

load_dotenv()

# Configuration
BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:5001")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# FastAPI app
app = FastAPI(title="EYeOn Surveillance Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global surveillance state
surveillance_active = False
active_user_id = None
surveillance_task = None

# ============ HEALTH & STATUS ============

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "EYeOn Surveillance Engine is running",
        "backend": BACKEND_URL,
        "timestamp": datetime.now().isoformat()
    }

@app.get("/status")
async def get_status():
    """Get surveillance status."""
    return {
        "running": False,
        "message": "Surveillance engine ready (camera dependencies not available)",
        "timestamp": datetime.now().isoformat()
    }

# ============ FACE ENCODING ============

@app.post("/encode")
async def encode_face(data: dict):
    """
    Encode a face from an image URL.
    Used when adding new family members or categories.
    """
    try:
        image_url = data.get("image_url")
        user_id = data.get("userId")
        
        if not image_url or not user_id:
            return {"success": False, "message": "image_url and userId required"}
        
        # For now, just return success without actual encoding
        # In production, this would use face_recognition library
        return {"success": True, "faces_detected": 1}
    
    except Exception as e:
        print(f"Encode error: {e}")
        return {"success": False, "message": str(e)}

# ============ CACHE MANAGEMENT ============

@app.post("/reload/{user_id}")
async def reload_cache(user_id: str):
    """Reload face cache for a user."""
    try:
        return {"ok": True, "user_id": user_id}
    except Exception as e:
        print(f"Reload error: {e}")
        return {"ok": False, "message": str(e)}

@app.post("/clear/{user_id}")
async def clear_cache(user_id: str):
    """Clear cache for a user."""
    return {"ok": True, "user_id": user_id}

# ============ SURVEILLANCE CONTROL ============

def create_test_frame(detection_num, test_image=None):
    """Create a test frame when camera is unavailable."""
    if test_image is not None:
        # Use the test image and add detection number
        frame = test_image.copy()
        cv2.putText(frame, f"Test Frame #{detection_num}", (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        return frame
    else:
        # Create a simple colored frame with text
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        img[:] = (240, 240, 250)  # Light gray background
        
        cv2.putText(img, "Camera Unavailable", (150, 200), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1.5, (100, 100, 100), 3)
        cv2.putText(img, f"Test Frame #{detection_num}", (180, 280), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1.2, (150, 150, 150), 2)
        
        return img

async def simulate_detections(user_id: str):
    """Capture real frames from the webcam and send to backend."""
    global surveillance_active

    detection_count = 0

    # Generate deterministic mock encodings per session (so cooldown works)
    mock_people = {
        "person_1": [random.random() for _ in range(128)],
        "person_2": [random.random() for _ in range(128)],
    }

    # Try multiple camera indices
    cap = None
    for cam_idx in [0, 1, 2]:
        print(f"[SURVEILLANCE] Trying camera index {cam_idx}...")
        cap = cv2.VideoCapture(cam_idx, cv2.CAP_DSHOW)  # Use DirectShow on Windows
        if cap.isOpened():
            # Set camera properties for better quality
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_FPS, 30)
            
            # Camera warm-up: discard first few frames
            print(f"[SURVEILLANCE] Warming up camera {cam_idx}...")
            for _ in range(5):
                cap.read()
                await asyncio.sleep(0.1)
            
            # Test if we can actually read a valid frame
            ret, test_frame = cap.read()
            if ret and test_frame is not None and test_frame.size > 0:
                # Check if frame is not completely black
                mean_brightness = np.mean(test_frame)
                if mean_brightness > 10:  # Not a black frame
                    print(f"[SURVEILLANCE] ✓ Camera {cam_idx} working (brightness: {mean_brightness:.1f})")
                    break
                else:
                    print(f"[SURVEILLANCE] Camera {cam_idx} produces black frames (brightness: {mean_brightness:.1f})")
            else:
                print(f"[SURVEILLANCE] Camera {cam_idx} failed frame test")
            
            cap.release()
            cap = None
        else:
            if cap:
                cap.release()
            cap = None
    
    # Load test image if camera not available
    test_image = None
    if not cap or not cap.isOpened():
        print("[SURVEILLANCE] ⚠️ Camera not available. Using test image fallback mode.")
        test_image_path = "test_face.jpg"
        if os.path.exists(test_image_path):
            test_image = cv2.imread(test_image_path)
            if test_image is not None:
                print(f"[SURVEILLANCE] ✓ Loaded test image: {test_image_path}")

    try:
        while surveillance_active and active_user_id == user_id:
            try:
                detection_count += 1
                person_key = "person_1" if detection_count % 2 == 1 else "person_2"

                # Get frame from camera or fallback
                if cap and cap.isOpened():
                    ok, frame = cap.read()
                    if ok and frame is not None and frame.size > 0:
                        # Check if frame is valid (not black)
                        mean_brightness = np.mean(frame)
                        if mean_brightness < 10:
                            print(f"[SURVEILLANCE] Black frame detected (brightness: {mean_brightness:.1f}), skipping...")
                            await asyncio.sleep(0.5)
                            continue
                    else:
                        print("[SURVEILLANCE] Failed to read frame, switching to fallback...")
                        cap.release()
                        cap = None
                        frame = create_test_frame(detection_count, test_image)
                else:
                    frame = create_test_frame(detection_count, test_image)

                ok, buf = cv2.imencode(".jpg", frame)
                if not ok:
                    print("[SURVEILLANCE] Failed to encode frame; retrying...")
                    await asyncio.sleep(1)
                    continue

                files = {
                    "image": (f"frame_{detection_count}.jpg", io.BytesIO(buf.tobytes()), "image/jpeg")
                }
                data = {
                    "userId": user_id,
                    "categoryName": "Unknown Person",
                    "faceEncoding": json.dumps(mock_people[person_key])
                }

                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{BACKEND_URL}/api/fastapi/event",
                        data=data,
                        files=files,
                        timeout=20.0
                    )
                    print(f"[SURVEILLANCE] Detection #{detection_count} sent: {response.status_code}")

                await asyncio.sleep(5)

            except Exception as e:
                print(f"[SURVEILLANCE] Detection error: {e}")
                await asyncio.sleep(5)
    
    finally:
        # Always release camera when done
        if cap is not None:
            try:
                cap.release()
                print("[SURVEILLANCE] Camera released")
            except Exception as e:
                print(f"[SURVEILLANCE] Error releasing camera: {e}")

@app.post("/surveillance/start")
async def start_surveillance(data: dict):
    """Start surveillance for a user."""
    global surveillance_active, active_user_id, surveillance_task
    
    try:
        user_id = data.get("userId")
        
        if not user_id:
            return {"success": False, "message": "userId required"}
        
        if surveillance_active:
            return {"success": False, "message": "Surveillance already running"}
        
        # Start surveillance
        surveillance_active = True
        active_user_id = user_id
        surveillance_task = asyncio.create_task(simulate_detections(user_id))
        
        print(f"[SURVEILLANCE] Started for user {user_id}")
        
        return {
            "status": "started",
            "user_id": user_id,
            "message": "Surveillance started (mock mode with simulated detections)",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"[SURVEILLANCE] Start error: {e}")
        return {"success": False, "message": str(e)}

@app.post("/surveillance/stop")
async def stop_surveillance():
    """Stop all surveillance."""
    global surveillance_active, active_user_id, surveillance_task
    
    try:
        surveillance_active = False
        active_user_id = None
        
        if surveillance_task:
            surveillance_task.cancel()
            try:
                await surveillance_task
            except asyncio.CancelledError:
                pass  # Expected when cancelling task
            except Exception as e:
                print(f"[SURVEILLANCE] Error while stopping: {e}")
            surveillance_task = None
        
        print("[SURVEILLANCE] ✓ Stopped")
        
        return {
            "status": "stopped",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"[SURVEILLANCE] Stop error: {e}")
        return {"success": False, "message": str(e)}

# ============ STARTUP & SHUTDOWN ============

@app.get("/startup")
async def startup():
    print("FastAPI Surveillance Engine started (mock mode - camera not available)")
    return {"status": "startup"}

# Note: Shutdown events are deprecated in newer FastAPI versions
# Use lifespan context managers instead in production

