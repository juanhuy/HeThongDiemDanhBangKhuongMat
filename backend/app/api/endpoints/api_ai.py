import os
import sys
import shutil
import cv2 as cv
import numpy as np
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db

# Import các Model Database mới
from app.models import Student, ClassSession, ClassEnrollment, AttendanceRecord, FaceFeature

# Thêm đường dẫn gốc để import FaceAnalyzer
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.append(project_root)

from core.face_analysis import FaceAnalyzer
from config.settings import settings

router = APIRouter()
analyzer = FaceAnalyzer()

db_config = settings.database
images_dir = os.path.join(project_root, db_config.get("images_dir", "./database/registered_images"))
os.makedirs(images_dir, exist_ok=True)

# =========================================================================
# HÀM BỔ TRỢ: LOGIC ĐIỂM DANH (ĐÃ ĐƯỢC TỐI ƯU NHỜ DB TRIGGER)
# =========================================================================
def record_attendance_db(db: Session, mssv: str, session_id: int = None, room_id: str = None, score: float = 0.0) -> tuple:
    """Ghi nhận điểm danh vào Database. Trạng thái Đi muộn/Đúng giờ do MySQL Trigger tự xử lý!"""
    if mssv in ["Spoof/Fake", "Unknown"]:
        return False, "Người lạ hoặc giả mạo", None

    # 1. Kiểm tra sinh viên
    student = db.query(Student).filter(Student.student_id == mssv).first()
    if not student or student.academic_status != "Đang học":
        return False, "SV chưa đăng ký hoặc không còn học", None

    now = datetime.now()
    target_session = None

    # 2. Tìm buổi học (ClassSession) phù hợp
    if session_id:
        target_session = db.query(ClassSession).filter(ClassSession.session_id == session_id).first()
    elif room_id:
        # Tự động tìm ca học đang diễn ra trong phòng này (Trước 30p và trong suốt 3h của ca học)
        sessions = db.query(ClassSession).filter(
            ClassSession.room_id == room_id,
            ClassSession.session_date == now.date()
        ).all()
        
        for s in sessions:
            if s.start_time - timedelta(minutes=30) <= now <= s.end_time:
                # Ưu tiên ca học mà SV này có đăng ký
                enrolled = db.query(ClassEnrollment).filter(
                    ClassEnrollment.class_id == s.class_id,
                    ClassEnrollment.student_id == mssv
                ).first()
                if enrolled:
                    target_session = s
                    break

    if not target_session:
        return False, "Không tìm thấy lịch học phù hợp", None

    # 3. Kiểm tra xem SV có đăng ký lớp này không
    enrolled = db.query(ClassEnrollment).filter(
        ClassEnrollment.class_id == target_session.class_id, 
        ClassEnrollment.student_id == mssv
    ).first()
    if not enrolled:
        return False, "Không có tên trong danh sách lớp", None

    # 4. Ghi nhận điểm danh (MySQL Trigger sẽ tự tính Present/Late/Absent dựa trên recorded_at)
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == target_session.session_id,
        AttendanceRecord.student_id == mssv
    ).first()

    if record and record.recorded_at:
        # Đã quét mặt trước đó rồi thì bỏ qua không update để giữ thời gian Check-in sớm nhất
        return True, record.status, student

    if not record:
        record = AttendanceRecord(
            session_id=target_session.session_id,
            student_id=mssv,
            recorded_at=now,
            confidence_score=score
        )
        db.add(record)
    else:
        record.recorded_at = now
        record.confidence_score = score

    db.commit()
    db.refresh(record) # Lấy lại trạng thái (status) vừa được Trigger của MySQL tính toán

    return True, record.status, student


# =========================================================================
# 1. API: NHẬN DIỆN KHUÔN MẶT QUA CAMERA (CORE AI)
# =========================================================================
@router.post("/recognize")
async def recognize_uploaded_image(
    file: Optional[UploadFile] = File(None),
    ma_buoi_hoc: Optional[int] = Query(None, description="Mã buổi học muốn ghi nhận."),
    phong_hoc: Optional[str] = Query(None, description="Tên phòng học từ Camera gửi lên."),
    db: Session = Depends(get_db)
):
    """API được Camera gọi liên tục để gửi Frame ảnh lên nhận diện"""
    if not file or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Vui lòng gửi file ảnh hợp lệ.")

    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv.imdecode(nparr, cv.IMREAD_COLOR)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi giải mã ảnh: {e}")

    # Gọi Model AI xử lý
    faces_results = analyzer.recognize_image(img)
    recognized_faces = []
    
    for face in faces_results:
        mssv = face["name"]
        score = face["score"]
        is_known = face["is_known"]
        
        ho_ten = "Unknown"
        lop_base = "Unknown"
        trang_thai = "Chưa xác định"
        
        if is_known and mssv not in ["Unknown", "Spoof/Fake"]:
            # Đưa vào logic DB để điểm danh
            success, msg, student_info = record_attendance_db(
                db, mssv, session_id=ma_buoi_hoc, room_id=phong_hoc, score=score
            )
            if student_info:
                ho_ten = student_info.profile.full_name if student_info.profile else "N/A"
                lop_base = student_info.administrative_class or "N/A"
            trang_thai = msg
        else:
            trang_thai = "Khuôn mặt lạ / Giả mạo"

        recognized_faces.append({
            "box": face["box"],
            "mssv": mssv,
            "fullname": ho_ten,
            "lop_base": lop_base,
            "score": score,
            "is_known": is_known,
            "trang_thai": trang_thai
        })

    return {
        "faces_detected": len(recognized_faces),
        "results": recognized_faces
    }


# =========================================================================
# 2. API: QUẢN LÝ DỮ LIỆU KHUÔN MẶT CỦA SINH VIÊN
# =========================================================================
@router.get("/{student_id}/faces")
def get_face_status(student_id: str, db: Session = Depends(get_db)):
    """Kiểm tra xem sinh viên đã có dữ liệu khuôn mặt (Vector) trong DB chưa"""
    db_student = db.query(Student).filter(Student.student_id == student_id.upper()).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
        
    faces = db.query(FaceFeature).filter(FaceFeature.student_id == student_id.upper()).all()
    return {
        "student_id": student_id, 
        "has_face_data": len(faces) > 0, 
        "total_vectors": len(faces)
    }

@router.post("/{student_id}/faces", status_code=status.HTTP_201_CREATED)
async def register_student_face(student_id: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Admin upload ảnh để AI trích xuất Vector và đăng ký nhận diện cho sinh viên"""
    db_student = db.query(Student).filter(Student.student_id == student_id.upper()).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Vui lòng tạo hồ sơ sinh viên trước khi đăng ký mặt.")
    
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Vui lòng upload file hình ảnh")
    
    student_id = student_id.upper()
    temp_img_path = os.path.join(images_dir, f"{student_id}.jpg")
    try:
        with open(temp_img_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi ghi file: {e}")
    
    # Lấy thông tin truyền vào thư viện InsightFace
    ho_ten = db_student.profile.full_name if db_student.profile else "Unknown"
    lop_base = db_student.administrative_class or "Unknown"
    
    # AI xử lý và ghi Vector khuôn mặt
    success = analyzer.dang_ky_mat(temp_img_path, mssv=student_id, ho_ten=ho_ten, lop_base=lop_base)
    
    if not success:
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)
        raise HTTPException(status_code=400, detail="AI không tìm thấy khuôn mặt rõ ràng, hoặc có nhiều hơn 1 khuôn mặt trong ảnh.")
    
    return {"status": "success", "message": "Đã lưu dữ liệu khuôn mặt thành công", "student_id": student_id}

@router.delete("/{student_id}/faces", status_code=status.HTTP_204_NO_CONTENT)
def reset_student_face(student_id: str, db: Session = Depends(get_db)):
    """Reset (Xóa) dữ liệu khuôn mặt của sinh viên nếu ảnh cũ bị lỗi"""
    db_student = db.query(Student).filter(Student.student_id == student_id.upper()).first()
    if not db_student:
        raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên")
        
    deleted_count = db.query(FaceFeature).filter(FaceFeature.student_id == student_id.upper()).delete()
    db.commit()
    
    if deleted_count == 0:
        raise HTTPException(status_code=400, detail="Sinh viên này chưa có dữ liệu khuôn mặt")
        
    # Xóa luôn file vật lý nếu có lưu
    img_path = os.path.join(images_dir, f"{student_id.upper()}.jpg")
    if os.path.exists(img_path):
        os.remove(img_path)
        
    return None