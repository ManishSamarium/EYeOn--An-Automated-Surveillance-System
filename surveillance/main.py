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
import time

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
        "running": surveillance_active,
        "user_id": active_user_id if surveillance_active else None,
        "message": "Surveillance engine ready with real-time face detection",
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

async def perform_surveillance(user_id: str):
    """Perform real-time surveillance with actual face detection and recognition."""
    global surveillance_active
    
    from face_engine import load_user_faces, detect_faces_in_frame, recognize_face
    
    # Load known faces for this user
    print(f"[SURVEILLANCE] Loading known faces for user {user_id}...")
    load_user_faces(user_id, BACKEND_URL)
    
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
    
    if not cap or not cap.isOpened():
        print("[SURVEILLANCE] ❌ No working camera found. Cannot start surveillance.")
        surveillance_active = False
        return
    
    print("[SURVEILLANCE] ✓ Camera ready. Starting face detection...")
    
    # Track recent detections to avoid spam (cooldown per face)
    last_detection_time = {}
    detection_cooldown = 10  # seconds between detections of same face
    frame_count = 0
    
    try:
        while surveillance_active and active_user_id == user_id:
            try:
                # Read frame from camera
                ok, frame = cap.read()
                if not ok or frame is None or frame.size == 0:
                    print("[SURVEILLANCE] Failed to read frame")
                    await asyncio.sleep(1)
                    continue
                
                # Check if frame is valid (not black/covered camera)
                mean_brightness = np.mean(frame)
                if mean_brightness < 10:
                    # Camera is covered or too dark
                    if frame_count % 20 == 0:  # Log every 20 frames
                        print(f"[SURVEILLANCE] Camera appears covered (brightness: {mean_brightness:.1f})")
                    frame_count += 1
                    await asyncio.sleep(0.5)
                    continue
                
                frame_count += 1
                
                # Detect faces in frame (every 3rd frame to reduce CPU load)
                if frame_count % 3 == 0:
                    faces = detect_faces_in_frame(frame)
                    
                    if faces:
                        print(f"[SURVEILLANCE] Detected {len(faces)} face(s) in frame")
                        
                        for face_encoding, face_location in faces:
                            # Recognize the face
                            face_type, face_name = recognize_face(face_encoding, user_id, tolerance=0.6)
                            
                            current_time = time.time()
                            
                            # Determine detection key for cooldown
                            if face_type == "family":
                                detection_key = f"family_{face_name}"
                            elif face_type == "category":
                                detection_key = f"category_{face_name}"
                            else:
                                # Unknown face - use encoding similarity
                                detection_key = f"unknown_{hash(tuple(face_encoding[:10]))}"
                            
                            # Check cooldown
                            if detection_key in last_detection_time:
                                time_since_last = current_time - last_detection_time[detection_key]
                                if time_since_last < detection_cooldown:
                                    continue  # Skip, still in cooldown
                            
                            # Update last detection time
                            last_detection_time[detection_key] = current_time
                            
                            # Draw rectangle around face for the captured image
                            top, right, bottom, left = face_location
                            cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
                            
                            # Add label
                            label = face_name if face_name else "Unknown"
                            cv2.putText(frame, label, (left, top - 10), 
                                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                            
                            # Encode frame as JPEG
                            ok, buf = cv2.imencode(".jpg", frame)
                            if not ok:
                                print("[SURVEILLANCE] Failed to encode frame")
                                continue
                            
                            # Prepare data to send to backend
                            files = {
                                "image": (f"detection_{int(current_time)}.jpg", 
                                         io.BytesIO(buf.tobytes()), "image/jpeg")
                            }
                            
                            data = {
                                "userId": user_id,
                                "faceEncoding": json.dumps(face_encoding.tolist())
                            }
                            
                            # Add category name for unknown faces
                            if not face_type:
                                data["categoryName"] = "Unknown Person"
                            elif face_type == "family":
                                data["familyName"] = face_name
                            elif face_type == "category":
                                data["categoryName"] = face_name
                            
                            # Send to backend
                            try:
                                async with httpx.AsyncClient() as client:
                                    response = await client.post(
                                        f"{BACKEND_URL}/api/fastapi/event",
                                        data=data,
                                        files=files,
                                        timeout=20.0
                                    )
                                    print(f"[SURVEILLANCE] Sent {face_type or 'unknown'} detection: {face_name or 'Unknown'} ({response.status_code})")
                            except Exception as e:
                                print(f"[SURVEILLANCE] Error sending detection: {e}")
                
                # Small delay between frames
                await asyncio.sleep(0.1)
                
            except Exception as e:
                print(f"[SURVEILLANCE] Frame processing error: {e}")
                await asyncio.sleep(1)
    
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
        surveillance_task = asyncio.create_task(perform_surveillance(user_id))
        
        print(f"[SURVEILLANCE] Started for user {user_id}")
        
        return {
            "status": "started",
            "user_id": user_id,
            "message": "Surveillance started with real-time face detection",
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

