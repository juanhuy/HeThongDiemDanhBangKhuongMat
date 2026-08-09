import requests
import numpy as np
import cv2

# Tạo một ảnh khuôn mặt giả (màu trơn hoặc lấy ảnh có sẵn)
# Tạo một ảnh ngẫu nhiên có kích thước 640x480 (mô phỏng webcam)
img = np.ones((480, 640, 3), dtype=np.uint8) * 128
cv2.circle(img, (320, 240), 100, (200, 150, 150), -1)

# Ghi ra file
cv2.imwrite("test_face.jpg", img)

# Gửi lên API
with open("test_face.jpg", "rb") as f:
    files = {"file": ("test_face.jpg", f, "image/jpeg")}
    response = requests.post("http://127.0.0.1:8000/api/recognize?phong_hoc=A2-301&challenge_only=true", files=files)

print("API Response:", response.json())
