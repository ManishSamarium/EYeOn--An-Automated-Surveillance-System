import cv2
import numpy as np

print("=" * 60)
print("CAMERA DIAGNOSTIC TEST")
print("=" * 60)

# Test camera 0
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
print(f"\nCamera 0 opened: {cap.isOpened()}")

if cap.isOpened():
    # Get camera properties
    width = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
    height = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    print(f"Camera properties:")
    print(f"  - Width: {width}")
    print(f"  - Height: {height}")
    print(f"  - FPS: {fps}")
    
    # Set properties
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    # Read frames
    print(f"\nReading 10 frames...")
    for i in range(10):
        ret, frame = cap.read()
        if ret and frame is not None:
            brightness = np.mean(frame)
            print(f"  Frame {i+1}: size={frame.shape}, brightness={brightness:.2f}")
        else:
            print(f"  Frame {i+1}: FAILED")
    
    cap.release()
    print("\n✅ Test complete")
else:
    print("❌ Cannot open camera")

print("=" * 60)
