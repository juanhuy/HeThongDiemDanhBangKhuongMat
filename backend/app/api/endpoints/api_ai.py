import os
import sys
import shutil
import cv2 as cv
import numpy as np
import csv
import time
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Query
from sqlalchemy.orm import Session
from app.db.session import get_db


# Thêm đường dẫn gốc để import FaceAnalyzer
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
if project_root not in sys.path:
    sys.path.append(project_root)

from core.face_analysis import FaceAnalyzer
from config.settings import settings
from app.models.subject import Subject
from app.models.student import Student
from app.models.credit_class import CreditClass
from app.models.student_class import StudentClassEnrollment
from app.models.class_schedule import ClassSchedule
from app.models.attendance_history import AttendanceHistory

router = APIRouter()

# Khởi tạo FaceAnalyzer
analyzer = FaceAnalyzer()

# Đọc cấu hình
db_config = settings.database
images_dir = os.path.join(project_root, db_config.get("images_dir", "./database/registered_images"))
os.makedirs(images_dir, exist_ok=True)

att_config = settings.attendance
log_file = os.path.join(project_root, att_config.get("log_file", "./logs/attendance_log.csv"))
os.makedirs(os.path.dirname(log_file), exist_ok=True)
cooldown_seconds = att_config.get("cooldown_seconds", 30)

# Cooldown tracking
last_attendance = {}

def init_csv_file():
    if not os.path.exists(log_file):
        with open(log_file, mode='w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(["Thời gian", "MSSV", "Họ tên", "Lớp chuyên ngành", "Mã buổi học", "Lớp tín chỉ", "Phòng học"])

init_csv_file()

def record_attendance_sqlalchemy(db: Session, mssv: str, ma_buoi_hoc: int = None, phong_hoc: str = None, score: float = 0.0) -> tuple:
    """
    Quy trình điểm danh tự động 6 bước sử dụng SQLAlchemy
    """
    if mssv == "Unknown":
        return False, "Người lạ/Chưa đăng ký mặt.", None

    # Tìm thông tin sinh viên
    student = db.query(Student).filter(Student.student_id == mssv).first()
    if not student or student.academic_status != "studying":
        # Ở đây ta giả sử trạng thái học tập tương đương hồ sơ đã duyệt hoặc đang học
        return False, "Người lạ/Chưa đăng ký mặt.", None

    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    
    session = None
    if ma_buoi_hoc is not None:
        # Ca học chỉ định sẵn
        sched = db.query(ClassSchedule).filter(ClassSchedule.schedule_id == ma_buoi_hoc).first()
        if sched:
            session = {
                "ma_buoi_hoc": sched.schedule_id,
                "ma_lop_tc": sched.class_id,
                "ngay_hoc": str(sched.study_date),
                "phong_hoc": sched.room,
                "gio_bat_dau": str(sched.start_time)
            }
        else:
            return False, "Buổi học không tồn tại.", None
    else:
        # Tìm lịch học hôm nay
        query = db.query(ClassSchedule)
        if phong_hoc:
            query = query.filter(ClassSchedule.room == phong_hoc.strip(), ClassSchedule.study_date == today_str)
        else:
            # Tìm tất cả lịch hôm nay
            query = query.filter(ClassSchedule.study_date == today_str)
            
        rows = query.all()
        if not rows:
            return False, "Phòng không có lịch học.", None

        # Lọc theo khung giờ học (trước 30 phút, sau 60 phút)
        valid_sessions = []
        for r in rows:
            try:
                clean_time = str(r.start_time).strip()
                if len(clean_time) == 5:
                    clean_time += ":00"
                start_time = datetime.strptime(f"{today_str} {clean_time}", "%Y-%m-%d %H:%M:%S")
                early_time = start_time - timedelta(minutes=30)
                late_time = start_time + timedelta(minutes=60)
                
                if early_time <= now <= late_time:
                    valid_sessions.append({
                        "ma_buoi_hoc": r.schedule_id,
                        "ma_lop_tc": r.class_id,
                        "ngay_hoc": str(r.study_date),
                        "phong_hoc": r.room,
                        "gio_bat_dau": str(r.start_time)
                    })
            except Exception as e:
                print(f"Loi phan tich thoi gian: {e}")

        if not valid_sessions:
            # Chế độ thử nghiệm/Fallback: Lấy bất kỳ lịch học nào của ngày hôm nay tại phòng đó
            if rows:
                for r in rows:
                    valid_sessions.append({
                        "ma_buoi_hoc": r.schedule_id,
                        "ma_lop_tc": r.class_id,
                        "ngay_hoc": str(r.study_date),
                        "phong_hoc": r.room,
                        "gio_bat_dau": str(r.start_time)
                    })
            if not valid_sessions:
                return False, "Sai ca học/Quét quá sớm.", None

        # Tìm buổi học sinh viên thực sự tham gia
        session = valid_sessions[0]
        for vs in valid_sessions:
            enrolled = db.query(StudentClassEnrollment).filter(
                StudentClassEnrollment.class_id == vs["ma_lop_tc"],
                StudentClassEnrollment.student_id == mssv
            ).first()
            if enrolled:
                session = vs
                break

    ma_buoi_hoc = session["ma_buoi_hoc"]
    ma_lop_tc = session["ma_lop_tc"]
    phong_hoc = session["phong_hoc"]
    gio_bat_dau_str = session["gio_bat_dau"]

    # Kiểm tra sinh viên có thuộc lớp tín chỉ không
    enrolled = db.query(StudentClassEnrollment).filter(
        StudentClassEnrollment.class_id == ma_lop_tc,
        StudentClassEnrollment.student_id == mssv
    ).first()
    if not enrolled:
        return False, "SV không thuộc lớp tín chỉ này.", None

    sv_dict = {
        "mssv": student.student_id,
        "ho_ten": student.full_name,
        "lop_base": student.administrative_class
    }

    # Kiểm tra xem sinh viên đã điểm danh cho buổi học này chưa
    existing_att = db.query(AttendanceHistory).filter(
        AttendanceHistory.student_id == mssv,
        AttendanceHistory.schedule_id == ma_buoi_hoc
    ).order_by(AttendanceHistory.check_in_time.asc()).first()

    if existing_att:
        # Giữ nguyên kết quả điểm danh ban đầu (không tạo bản ghi mới, không bị đổi từ Đúng giờ thành Đi muộn)
        return True, existing_att.status, sv_dict

    # Đánh giá thời gian vào lớp (Muộn hay Đúng giờ) cho lần quét đầu tiên
    try:
        clean_start = gio_bat_dau_str.strip()
        if len(clean_start) == 5:
            clean_start += ":00"
        start_time_only = datetime.strptime(clean_start, "%H:%M:%S").time()
        current_time_only = now.time()
        
        if current_time_only <= start_time_only:
            trang_thai = "Đúng giờ"
        else:
            trang_thai = "Đi muộn"
    except Exception as e:
        print(f"Loi so sanh gio hoc: {e}")
        trang_thai = "Đúng giờ"

    # Kiểm tra cooldown
    current_ts = time.time()
    last_time = last_attendance.get(mssv, 0)
    if current_ts - last_time < cooldown_seconds:
        return True, trang_thai, sv_dict

    # Ghi nhận vào DB lần đầu
    try:
        new_att = AttendanceHistory(
            student_id=mssv,
            schedule_id=ma_buoi_hoc,
            status=trang_thai,
            confirmed_by="AI"
        )
        db.add(new_att)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Lỗi ghi nhận database: {e}")
        return False, "Lỗi ghi nhận database.", None


    # Ghi nhận log CSV backup
    now_str = now.strftime("%Y-%m-%d %H:%M:%S")
    try:
        with open(log_file, mode='a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([now_str, mssv, student.full_name, student.administrative_class, ma_buoi_hoc, ma_lop_tc, phong_hoc])
        print(f"-> [DIEM DANH THANH CONG] {student.full_name} ({mssv}) - {trang_thai} tai phong {phong_hoc} luc {now_str} (Score: {score:.2f})")
    except Exception as e:
        print(f"Lỗi ghi log CSV: {e}")

    last_attendance[mssv] = current_ts
    return True, trang_thai, sv_dict


@router.post("/register")
async def register_student(
    mssv: str = Form(...),
    ho_ten: str = Form(...),
    lop_base: str = Form(...),
    file: UploadFile = File(...),
    ngay_sinh: str = Form(None),
    gioi_tinh: str = Form(None),
    sdt: str = Form(None),
    cccd: str = Form(None),
    dan_toc: str = Form(None),
    ton_giao: str = Form(None),
    noi_sinh: str = Form(None),
    quoc_tich: str = Form(None),
    email: str = Form(None),
    dia_chi: str = Form(None),
    db: Session = Depends(get_db)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File gui len phai la file anh.")

    mssv = mssv.strip().upper()
    img_filename = f"{mssv}.jpg"
    temp_img_path = os.path.join(images_dir, img_filename)

    try:
        with open(temp_img_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Khong the ghi file anh: {e}")

    # Đăng ký AI Vector
    ai_success = analyzer.dang_ky_mat(
        temp_img_path, mssv, ho_ten, lop_base,
        ngay_sinh=ngay_sinh, gioi_tinh=gioi_tinh, sdt=sdt, cccd=cccd,
        dan_toc=dan_toc, ton_giao=ton_giao, noi_sinh=noi_sinh,
        quoc_tich=quoc_tich, email=email, dia_chi=dia_chi
    )
    if not ai_success:
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)
        raise HTTPException(status_code=400, detail="AI khong tim thay khuon mat hop le (hoac co qua nhieu mat) trong anh.")

    return {
        "status": "success",
        "message": f"Dang ky thanh cong sinh vien {ho_ten} ({mssv})."
    }


@router.post("/recognize")
async def recognize_uploaded_image(
    file: Optional[UploadFile] = File(None),
    ma_buoi_hoc: Optional[int] = Query(None, description="Mã buổi học muốn ghi nhận."),
    phong_hoc: Optional[str] = Query(None, description="Tên phòng học từ Camera gửi lên."),
    db: Session = Depends(get_db)
):
    if not file:
        return {
            "faces_detected": 0,
            "results": [],
            "message": "Không nhận được file ảnh (Chế độ giả lập)"
        }

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File gửi lên phải là file ảnh.")

    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv.imdecode(nparr, cv.IMREAD_COLOR)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Không thể giải mã file ảnh: {e}")

    if img is None:
        raise HTTPException(status_code=400, detail="Ảnh bị lỗi hoặc không thể đọc.")

    faces_results = analyzer.recognize_image(img)
    
    recognized_faces = []
    for face in faces_results:
        mssv = face["name"]
        score = face["score"]
        is_known = face["is_known"]
        ho_ten = "Unknown"
        lop_base = "Unknown"
        trang_thai = "Chưa xác định"
        
        # Lấy thông tin họ tên từ db nếu sinh viên đã được nhận diện
        if is_known and mssv != "Unknown":
            student_info = db.query(Student).filter(Student.student_id == mssv).first()
            if student_info:
                ho_ten = student_info.full_name
                lop_base = student_info.administrative_class

        success, msg, sv_info = record_attendance_sqlalchemy(
            db, mssv, ma_buoi_hoc=ma_buoi_hoc, phong_hoc=phong_hoc, score=score
        )
        
        if sv_info:
            ho_ten = sv_info["ho_ten"]
            lop_base = sv_info["lop_base"]
            trang_thai = msg
        else:
            trang_thai = msg if msg else "Chưa đăng ký"



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
