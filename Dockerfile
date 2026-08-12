# ============================================================
# Backend — Hệ Thống Điểm Danh Bằng Khuôn Mặt
# Chạy trên CPU (InsightFace tự fallback CPU khi không có CUDA)
# ============================================================
FROM python:3.14-slim

# Hệ thống phụ thuộc cho OpenCV (cv2) + onnxruntime
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements trước để tận dụng Docker layer cache
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy toàn bộ mã nguồn
COPY . /app

# Copy model InsightFace buffalo_l (đã có sẵn ở ~/.insightface) vào image
# Để FaceAnalysis tìm thấy mà không phải tải lại 300MB khi khởi động.
COPY models-insightface/ /root/.insightface/models/

# Copy ảnh khuôn mặt demo vào đúng thư mục api_ai sử dụng
# (backend/app/database/registered_images — dùng được ngay khi volume trống)
COPY database/registered_images/ /app/backend/app/database/registered_images/

WORKDIR /app/backend

EXPOSE 8000

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
