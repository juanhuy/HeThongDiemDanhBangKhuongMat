from core.liveness_detection import LivenessDetector
import cv2
import numpy as np
detector = LivenessDetector()
print("Detector session:", detector.session)
