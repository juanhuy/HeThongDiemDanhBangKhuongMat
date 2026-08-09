import cv2 as cv
import numpy as np
import onnxruntime as ort
from core.liveness_detection import LivenessDetector

detector = LivenessDetector()
print("Detector enabled:", detector.enabled)
print("Session loaded:", detector.session is not None)

# Fake frame and bbox
frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
bbox = [100, 100, 200, 200]
is_real, score = detector.is_real_face(frame, bbox)
print(f"Random noise frame -> is_real: {is_real}, score: {score}")

