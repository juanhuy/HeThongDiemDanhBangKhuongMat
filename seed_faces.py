"""
SEED KHUÔN MẶT DEMO — đăng ký sẵn khuôn mặt từ ảnh có sẵn trong thư mục ảnh.

Dùng cho Docker: sau khi seed_demo tạo tài khoản/lớp, script này nạp face vector
cho các SV đã có ảnh để demo điểm danh AI không cần đăng ký lại.

Chạy:
    python seed_faces.py
"""
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, "backend"))

from config.settings import settings  # noqa: E402
from core.face_analysis import FaceAnalyzer  # noqa: E402

# Thư mục ảnh mà api_ai.py thực sự dùng (giữ nguyên logic của api_ai):
#   project_root = backend/app  ->  images_dir = backend/app/database/registered_images
_API_ROOT = os.path.join(PROJECT_ROOT, "backend", "app")
IMAGES_DIR = os.path.join(
    _API_ROOT,
    settings.database.get("images_dir", "./database/registered_images"),
)


def main():
    analyzer = FaceAnalyzer()
    registered = 0
    if not os.path.isdir(IMAGES_DIR):
        print(f"Khong tim thay thu muc anh: {IMAGES_DIR}")
        return

    for fname in sorted(os.listdir(IMAGES_DIR)):
        if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        mssv = os.path.splitext(fname)[0].strip().upper()
        # Chỉ đăng ký MSSV hợp lệ (dạng mã SV), bỏ các file test vô nghĩa
        if not (mssv.startswith("N") and len(mssv) >= 6):
            continue
        path = os.path.join(IMAGES_DIR, fname)
        print(f"-> Dang ky khuon mat cho {mssv} ({fname}) ...")
        if analyzer.dang_ky_mat(path, mssv, ho_ten=mssv, lop_base="Docker"):
            registered += 1

    print(f"==> Da dang ky {registered} khuon mat.")
    analyzer.stop_worker()


if __name__ == "__main__":
    main()
