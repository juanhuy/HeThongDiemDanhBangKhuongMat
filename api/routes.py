import os
import shutil
import cv2 as cv
import numpy as np
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from core.face_analysis import FaceAnalyzer
from services.database_service import DatabaseService
from services.attendance_service import AttendanceService
from config.settings import settings

router = APIRouter()

# Khởi tạo các services dùng chung trong API
db_service = DatabaseService()
attendance_service = AttendanceService(db_service)
analyzer = FaceAnalyzer()

# Đọc cấu hình thư mục lưu ảnh chân dung đăng ký
db_config = settings.database
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
images_dir = os.path.join(project_root, db_config.get("images_dir", "./database/registered_images"))
os.makedirs(images_dir, exist_ok=True)

@router.get("/")
def read_root():
    return {
        "status": "online",
        "message": "He thong nhan dien khuon mat API dang hoat dong.",
        "loaded_faces_count": len(analyzer.known_names)
    }

@router.get("/api/users")
def get_users():
    """Lấy danh sách tất cả thành viên trong hệ thống"""
    try:
        with db_service.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT username, fullname, created_at FROM users")
            rows = cursor.fetchall()
            users = [{"username": r[0], "fullname": r[1], "created_at": r[2]} for r in rows]
            return {"users": users}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Loi truy van database: {e}")

@router.post("/api/register")
async def register_user(
    username: str = Form(...),
    fullname: str = Form(...),
    file: UploadFile = File(...)
):
    """Đăng ký khuôn mặt mới thông qua API"""
    # 1. Kiểm tra định dạng ảnh
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File gui len phai la file anh.")

    # Tạo đường dẫn lưu ảnh chân dung
    username = username.strip().lower()
    img_filename = f"{username}.jpg"
    temp_img_path = os.path.join(images_dir, img_filename)

    # 2. Lưu file ảnh tạm thời lên Server
    try:
        with open(temp_img_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Khong the ghi file anh: {e}")

    # 3. Đăng ký trên SQLite và AI Vector DB
    # Lưu SQLite trước
    db_success = db_service.add_user(username, fullname)
    if not db_success:
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)
        raise HTTPException(status_code=500, detail="Khong the dang ky nguoi dung vao SQLite.")

    # Đăng ký AI Vector
    ai_success = analyzer.dang_ky_mat(temp_img_path, username)
    if not ai_success:
        # Nếu AI trích xuất thất bại (ví dụ: không có mặt hoặc quá 1 mặt), xóa ảnh và trả lỗi
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)
        raise HTTPException(status_code=400, detail="AI khong tim thay khuon mat hop le (hoac co qua nhieu mat) trong anh.")

    return {
        "status": "success",
        "message": f"Dang ky thanh cong cho {fullname} ({username})."
    }

@router.get("/api/attendance")
def get_attendance_history():
    """Lấy danh sách lịch sử điểm danh gần đây nhất"""
    try:
        with db_service.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT username, fullname, score, timestamp FROM attendance_logs ORDER BY timestamp DESC LIMIT 100")
            rows = cursor.fetchall()
            logs = [{"username": r[0], "fullname": r[1], "score": r[2], "timestamp": r[3]} for r in rows]
            return {"logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Loi truy van database: {e}")

@router.post("/api/recognize")
async def recognize_uploaded_image(file: UploadFile = File(...)):
    """Nhận diện khuôn mặt từ một hình ảnh upload từ client và điểm danh tự động"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File gui len phai la file anh.")

    # Đọc file ảnh từ bộ nhớ trực tiếp sang OpenCV bằng numpy
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv.imdecode(nparr, cv.IMREAD_COLOR)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Khong the giai ma file anh: {e}")

    if img is None:
        raise HTTPException(status_code=400, detail="Anh bi loi hoac khong the doc.")

    # Gọi AI nhận dạng
    faces_results = analyzer.recognize_image(img)
    
    # Duyệt qua các khuôn mặt tìm thấy để tiến hành điểm danh tự động
    recognized_faces = []
    for face in faces_results:
        username = face["name"]
        score = face["score"]
        is_known = face["is_known"]
        fullname = "Unknown"

        if is_known:
            # Ghi nhận điểm danh
            attendance_service.record_attendance(username, score)
            # Truy vấn tên đầy đủ
            user_info = db_service.get_user(username)
            if user_info:
                fullname = user_info["fullname"]
        
        recognized_faces.append({
            "box": face["box"],
            "username": username,
            "fullname": fullname,
            "score": score,
            "is_known": is_known
        })

    return {
        "faces_detected": len(recognized_faces),
        "results": recognized_faces
    }
