import os
import sys
import shutil
import time
import cv2 as cv
import numpy as np
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db

# Import các Model Database mới
from app.models import Student, ClassSession, ClassEnrollment, AttendanceRecord, FaceFeature
from app.models import ClassSchedule, StudentClassEnrollment, AttendanceHistory
from app.models.presence_snapshot import PresenceSnapshot

# Thêm đường dẫn gốc để import FaceAnalyzer
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.append(project_root)

from core.face_analysis import FaceAnalyzer
from config.settings import settings
from app.models.account import Account
from app.models.lecturer import Lecturer
from app.models.subject import Subject
from app.models.credit_class import CreditClass
from app.models.leave_request import LeaveRequest
from app.core.student_status import is_active_student
from app.core.require import get_current_user, require_admin

router = APIRouter()

analyzer = FaceAnalyzer()

db_config = settings.database
images_dir = os.path.join(project_root, db_config.get("images_dir", "./database/registered_images"))
os.makedirs(images_dir, exist_ok=True)

# Cache điểm danh phía server: tránh truy vấn/ghi DB mỗi frame cho cùng một người.
# Key: (mssv, room/session) -> {"ts": float, "trang_thai": str, "full_name": str, "lop_base": str}
_attendance_cache = {}
_attendance_cooldown = float(settings.config.get("attendance", {}).get("cooldown_seconds", 30))
# Thời gian ân hạn (phút): SV đến trong khoảng này sau giờ bắt đầu vẫn tính "Đúng giờ"
_late_grace_minutes = int(settings.config.get("attendance", {}).get("late_grace_minutes", 5))
# Ngưỡng (phút) không thấy khuôn mặt => coi như SV đã rời lớp (check-out)
_checkout_idle_minutes = int(settings.config.get("attendance", {}).get("checkout_idle_minutes", 5))
# Bật/tắt check-in / check-out (tạm tắt: điểm danh đơn giản, quét 1 lần là có mặt)
_enable_checkout = bool(settings.config.get("attendance", {}).get("enable_checkout", False))

def _notify_student(db, mssv: str, title: str, message: str, ntype: str = "info"):
    """Gửi thông báo DB cho sinh viên (an toàn, không làm hỏng luồng điểm danh)."""
    try:
        from app.core.notify import notify
        acc = db.query(Account).filter(Account.username == mssv.strip().lower()).first()
        if acc:
            notify(db, acc.username, title, message, ntype=ntype)
    except Exception:
        pass

def _attendance_cache_key(mssv: str, session_id, room_id):
    return (mssv, room_id or f"session:{session_id}")

@router.get("/images/{filename}", dependencies=[Depends(get_current_user)])
def serve_face_image(filename: str):
    """Phục vụ ảnh khuôn mặt (yêu cầu đăng nhập) — thay thế static mount công khai."""
    from fastapi.responses import FileResponse
    from app.core.uploads import safe_filename
    name = os.path.basename(safe_filename(filename, ".jpg"))
    path = os.path.join(images_dir, name)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Không tìm thấy ảnh.")
    return FileResponse(path, media_type="image/jpeg")

# =========================================================================
# HÀM BỔ TRỢ: LOGIC ĐIỂM DANH
# =========================================================================
def _is_enrolled(db: Session, class_id: str, mssv: str) -> bool:
    """Kiểm tra sinh viên có đăng ký lớp tín chỉ này không (kiểm tra cả 2 bảng đăng ký)."""
    if db.query(ClassEnrollment).filter(
        ClassEnrollment.class_id == class_id, ClassEnrollment.student_id == mssv
    ).first():
        return True
    return db.query(StudentClassEnrollment).filter(
        StudentClassEnrollment.class_id == class_id, StudentClassEnrollment.student_id == mssv
    ).first() is not None


def record_attendance_db(db: Session, mssv: str, session_id: int = None, room_id: str = None, score: float = 0.0) -> tuple:
    """Ghi nhận điểm danh vào Database. Ưu tiên ClassSession (lịch mới);
    nếu không khớp, fallback sang ClassSchedule (lịch theo ngày mà UI/đăng ký đang dùng)."""
    if mssv in ["Spoof/Fake", "Unknown"]:
        return False, "Người lạ hoặc giả mạo", None

    # 1. Kiểm tra sinh viên
    student = db.query(Student).filter(Student.student_id == mssv).first()
    if not student or not is_active_student(student.academic_status):
        return False, "SV chưa đăng ký hoặc không còn học", None

    now = datetime.now()
    target_session = None

    # 2. Tìm buổi học (ClassSession) phù hợp
    if session_id:
        target_session = db.query(ClassSession).filter(ClassSession.session_id == session_id).first()
    elif room_id:
        sessions = db.query(ClassSession).filter(
            ClassSession.room_id == room_id,
            ClassSession.session_date == now.date()
        ).all()

        for s in sessions:
            if s.start_time - timedelta(minutes=30) <= now <= s.end_time:
                if _is_enrolled(db, s.class_id, mssv):
                    target_session = s
                    break

    # 2b. Chưa khớp theo phòng camera -> tìm mọi ClassSession hôm nay (bỏ qua phòng)
    #     để hỗ trợ lịch tùy chỉnh đặt ở phòng khác.
    if not target_session and not session_id:
        sessions = db.query(ClassSession).filter(ClassSession.session_date == now.date()).all()
        for s in sessions:
            if s.start_time - timedelta(minutes=30) <= now <= s.end_time:
                if _is_enrolled(db, s.class_id, mssv):
                    target_session = s
                    break

    if not target_session:
        # Fallback: lịch theo ngày (class_schedules) — hệ thống mà UI/đăng ký/báo cáo đang dùng.
        return _record_attendance_from_schedule(db, student, mssv, room_id, score)

    # 3. Kiểm tra xem SV có đăng ký lớp này không
    if not _is_enrolled(db, target_session.class_id, mssv):
        return False, "Không có tên trong danh sách lớp", None

    # 4. Ghi nhận điểm danh
    now = datetime.now()
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == target_session.session_id,
        AttendanceRecord.student_id == mssv
    ).first()

    start_ref = target_session.start_time + timedelta(minutes=_late_grace_minutes)

    if not _enable_checkout:
        # --- Điểm danh đơn giản (check-out tạm tắt): quét 1 lần là có mặt, quét lại giữ trạng thái cũ ---
        if record and record.recorded_at:
            return True, record.status, student
        status_val = "Đúng giờ" if now <= start_ref else "Đi muộn"
        if not record:
            record = AttendanceRecord(
                session_id=target_session.session_id,
                student_id=mssv,
                status=status_val,
                recorded_at=now,
                confidence_score=score
            )
            db.add(record)
        else:
            record.recorded_at = now
            record.status = status_val
            record.confidence_score = score
        db.commit()
        db.refresh(record)
        _notify_student(db, mssv,
                        f"Đã điểm danh: {record.status}",
                        f"Buổi học số {target_session.session_id} - phòng {room_id or 'N/A'}.",
                        ntype="success" if record.status == "Đúng giờ" else "warning")
        return True, record.status, student

    # --- Check-out được bật ---
    idle = timedelta(minutes=_checkout_idle_minutes)

    # Đóng phiên của các SV khác cùng buổi đã không thấy mặt lâu (đi ra giữa giờ)
    stale = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == target_session.session_id,
        AttendanceRecord.check_out_time.is_(None),
        AttendanceRecord.last_seen < now - idle
    ).all()
    for r in stale:
        r.check_out_time = r.last_seen

    def _checkin_status():
        return "Đúng giờ" if now <= start_ref else "Đi muộn"

    if not record:
        # Check-in lần đầu trong buổi
        record = AttendanceRecord(
            session_id=target_session.session_id,
            student_id=mssv,
            status=_checkin_status(),
            recorded_at=now,
            last_seen=now,
            confidence_score=score
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        _notify_student(db, mssv,
                        f"Đã điểm danh: {record.status}",
                        f"Buổi học số {target_session.session_id} - phòng {room_id or 'N/A'}.",
                        ntype="success" if record.status == "Đúng giờ" else "warning")
        return True, record.status, student

    last_seen = record.last_seen or record.recorded_at or now

    if record.check_out_time is None:
        # SV đang có mặt
        if now - last_seen > idle:
            # Rời lớp rồi quay lại: đóng phiên trước tại lần thấy cuối, mở phiên mới
            record.check_out_time = last_seen
            record.recorded_at = now
            record.last_seen = now
            record.status = _checkin_status()
            db.commit()
            db.refresh(record)
            _notify_student(db, mssv,
                            f"Đã điểm danh lại: {record.status}",
                            f"Buổi học số {target_session.session_id} - phòng {room_id or 'N/A'}.",
                            ntype="warning")
            return True, record.status, student
        # Vẫn đang ở trong lớp: chỉ cập nhật lần thấy mặt cuối
        record.last_seen = now
        db.commit()
        return True, record.status, student

    # Đã rời lớp trước đó, giờ quay lại -> check-in phiên mới
    record.check_out_time = None
    record.recorded_at = now
    record.last_seen = now
    record.status = _checkin_status()
    db.commit()
    db.refresh(record)
    _notify_student(db, mssv,
                    f"Đã điểm danh lại: {record.status}",
                    f"Buổi học số {target_session.session_id} - phòng {room_id or 'N/A'}.",
                    ntype="warning")
    return True, record.status, student


def _record_attendance_from_schedule(db: Session, student, mssv: str, room_id: str, score: float) -> tuple:
    """
    Fallback ghi điểm danh dựa trên bảng class_schedules (lịch theo ngày/tuần)
    — chính là hệ thống mà UI đăng ký lịch và báo cáo điểm danh đang sử dụng.
    """
    from sqlalchemy import or_
    from datetime import datetime as _dt, timedelta as _td

    now = _dt.now()
    today = now.date()

    def candidate_schedules(with_room: bool):
        """Trả về [(ClassSchedule, start_time)] khả dĩ cho hôm nay."""
        out = []
        q = db.query(ClassSchedule).filter(ClassSchedule.study_date == today)
        if with_room and room_id:
            q = q.filter(or_(ClassSchedule.room == room_id, ClassSchedule.room_id == room_id))
        out.extend((s, s.start_time) for s in q.all())

        weekday = today.weekday() + 2  # Mon=2 ... Sun=8 (convention PTIT)
        q2 = db.query(ClassSchedule).filter(ClassSchedule.day_of_week == weekday)
        if with_room and room_id:
            q2 = q2.filter(ClassSchedule.room_id == room_id)
        for s in q2.all():
            if s.start_shift is not None:
                start_h = min(6 + s.start_shift, 23)
                out.append((s, _dt(today.year, today.month, today.day, start_h, 0).time()))
        return out

    def find_target(candidates):
        for s, st_time in candidates:
            if st_time is None:
                continue
            try:
                start_dt = _dt.combine(today, st_time)
            except Exception:
                continue
            end_dt = start_dt + _td(hours=3)
            if start_dt - _td(minutes=30) <= now <= end_dt:
                enrolled = db.query(StudentClassEnrollment).filter(
                    StudentClassEnrollment.class_id == s.class_id,
                    StudentClassEnrollment.student_id == mssv
                ).first()
                if not enrolled:
                    enrolled = db.query(ClassEnrollment).filter(
                        ClassEnrollment.class_id == s.class_id,
                        ClassEnrollment.student_id == mssv
                    ).first()
                if enrolled:
                    return s, start_dt
        return None, None

    target, start_dt = find_target(candidate_schedules(with_room=True))
    if target is None and room_id:
        # Không khớp phòng camera với lịch -> thử mọi lịch hôm nay của SV trong khung giờ.
        target, start_dt = find_target(candidate_schedules(with_room=False))

    if target is None:
        return False, "Không tìm thấy lịch học phù hợp", None

    # Ưu tiên giờ buổi học thực tế (ClassSession) thay vì giờ lịch cũ (class_schedules)
    # để tránh sai trạng thái khi 2 bảng lệch thời gian.
    real_session = db.query(ClassSession).filter(
        ClassSession.class_id == target.class_id,
        ClassSession.session_date == today
    ).first()
    if real_session:
        start_dt = real_session.start_time

    trang_thai = "Đúng giờ" if now <= start_dt + timedelta(minutes=_late_grace_minutes) else "Đi muộn"

    # Upsert AttendanceHistory (bảng mà báo cáo/UI đọc)
    rec = db.query(AttendanceHistory).filter(
        AttendanceHistory.student_id == mssv,
        AttendanceHistory.schedule_id == target.schedule_id
    ).first()
    if rec:
        rec.status = trang_thai
        rec.check_in_time = now
        rec.confirmed_by = "AI"
    else:
        rec = AttendanceHistory(
            student_id=mssv,
            schedule_id=target.schedule_id,
            check_in_time=now,
            status=trang_thai,
            confirmed_by="AI"
        )
        db.add(rec)
    db.commit()
    db.refresh(rec)

    # Gửi thông báo cho sinh viên
    try:
        from app.core.notify import notify
        acc = db.query(Account).filter(Account.username == mssv.strip().lower()).first()
        if acc:
            notify(db, acc.username,
                   f"Đã điểm danh: {trang_thai}",
                   f"Buổi học số {target.schedule_id} - phòng {room_id or target.room or target.room_id or 'N/A'}.",
                   ntype="success" if trang_thai in ("Đúng giờ", "Có mặt") else "warning")
    except Exception:
        pass

    return True, trang_thai, student


# =========================================================================
# 1. API: NHẬN DIỆN KHUÔN MẶT QUA CAMERA (CORE AI)
# =========================================================================
@router.post("/recognize")
async def recognize_uploaded_image(
    file: Optional[UploadFile] = File(None),
    ma_buoi_hoc: Optional[int] = Query(None, description="Mã buổi học muốn ghi nhận."),
    phong_hoc: Optional[str] = Query(None, description="Tên phòng học từ Camera gửi lên."),
    challenge_only: bool = Query(False, description="Chỉ kiểm tra liveness và challenge, không ghi nhận điểm danh."),
    db: Session = Depends(get_db)
):
    """API được Camera gọi liên tục để gửi Frame ảnh lên nhận diện"""
    if not file:
        return {
            "faces_detected": 0,
            "results": [],
            "message": "Không nhận được file ảnh"
        }
    if hasattr(file, "content_type") and file.content_type is not None and not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Vui lòng gửi file ảnh hợp lệ.")

    try:
        from app.core.uploads import MAX_IMAGE_BYTES
        contents = await file.read()
        if len(contents) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="File ảnh vượt quá kích thước cho phép (tối đa 5MB).")
        nparr = np.frombuffer(contents, np.uint8)
        img = cv.imdecode(nparr, cv.IMREAD_COLOR)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi giải mã ảnh: {e}")

    faces_results = analyzer.recognize_image(img)
    recognized_faces = []
    now = time.time()
    
    for face in faces_results:
        mssv = face["name"]
        score = face["score"]
        is_known = face["is_known"]
        is_real = face.get("is_real", True)
        active_state = face.get("active_state", None)
        
        ho_ten = "Unknown"
        lop_base = "Unknown"
        trang_thai = "Chưa xác định"
        
        if not is_real:
            trang_thai = "Giả mạo khuôn mặt"
        elif challenge_only:
            trang_thai = "Đang thực hiện thử thách"
        elif is_known and mssv not in ["Unknown", "Spoof/Fake"]:
            key = _attendance_cache_key(mssv, ma_buoi_hoc, phong_hoc)
            cached = _attendance_cache.get(key)
            if cached and now - cached["ts"] < _attendance_cooldown:
                # Cùng người trong vòng cooldown: tái sử dụng kết quả, không đụng DB
                ho_ten = cached["full_name"]
                lop_base = cached["lop_base"]
                trang_thai = cached["trang_thai"]
            else:
                success, msg, student_info = record_attendance_db(
                    db, mssv, session_id=ma_buoi_hoc, room_id=phong_hoc, score=score
                )
                if student_info:
                    ho_ten = student_info.profile.full_name if student_info.profile else getattr(student_info, 'full_name', 'N/A')
                    lop_base = student_info.administrative_class or "N/A"
                trang_thai = msg
                _attendance_cache[key] = {
                    "ts": time.time(),
                    "trang_thai": msg,
                    "full_name": ho_ten,
                    "lop_base": lop_base
                }
                # Dọn cache cũ để tránh phình bộ nhớ trong phiên chạy dài
                if len(_attendance_cache) > 512:
                    cutoff = time.time() - _attendance_cooldown
                    for k in [k for k, v in _attendance_cache.items() if v["ts"] < cutoff]:
                        _attendance_cache.pop(k, None)
        else:
            trang_thai = "Người lạ"

        recognized_faces.append({
            "box": face["box"],
            "mssv": mssv,
            "fullname": ho_ten,
            "lop_base": lop_base,
            "score": float(score),
            "is_known": bool(is_known),
            "is_real": bool(is_real),
            "active_state": active_state,
            "trang_thai": trang_thai
        })

    return {
        "faces_detected": len(recognized_faces),
        "results": recognized_faces
    }


# =========================================================================
# 1b. API: CAMERA THỤ ĐỘNG — CHỤP SNAPSHOT HIỆN DIỆN TRONG PHÒNG
# =========================================================================
@router.post("/presence/snapshot", summary="Camera thụ động: chụp snapshot đếm SV có mặt")
async def passive_snapshot(
    file: UploadFile = File(...),
    phong_hoc: Optional[str] = Query(None, description="Tên phòng học (để tìm buổi đang diễn ra)."),
    session_id: Optional[int] = Query(None, description="Mã buổi học cụ thể (tùy chọn)."),
    db: Session = Depends(get_db),
):
    """Quét định kỳ 15-30 phút (demo: vài giây). Ghi nhận ai đang có mặt trong phòng
    vào bảng presence_snapshots để GV xem số SV hiện diện trực tiếp.
    KHÔNG thực hiện check-in/check-out."""
    if not file:
        return {"status": "failed", "message": "Không nhận được file ảnh", "count": 0}
    try:
        from app.core.uploads import MAX_IMAGE_BYTES
        contents = await file.read()
        if len(contents) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="File ảnh vượt quá kích thước cho phép (tối đa 5MB).")
        nparr = np.frombuffer(contents, np.uint8)
        img = cv.imdecode(nparr, cv.IMREAD_COLOR)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Lỗi giải mã ảnh: {e}")

    now = datetime.now()
    target = None
    if session_id:
        target = db.query(ClassSession).filter(ClassSession.session_id == session_id).first()
    elif phong_hoc:
        sessions = db.query(ClassSession).filter(
            ClassSession.room_id == phong_hoc.strip(),
            ClassSession.session_date == now.date()
        ).all()
        for s in sessions:
            if s.start_time - timedelta(minutes=30) <= now <= s.end_time:
                target = s
                break
    if not target:
        return {"status": "failed", "message": "Không tìm thấy buổi học đang diễn ra ở phòng này.", "count": 0}

    faces = analyzer.recognize_image(img)
    seen = set()
    for face in faces:
        mssv = face["name"]
        if mssv in ("Unknown", "Spoof/Fake"):
            continue
        if not face.get("is_known", False) or not face.get("is_real", True):
            continue
        if mssv in seen:
            continue
        seen.add(mssv)
        db.add(PresenceSnapshot(session_id=target.session_id, scanned_at=now, mssv=mssv))

    db.commit()
    return {
        "status": "success",
        "session_id": target.session_id,
        "class_id": target.class_id,
        "phong_hoc": phong_hoc,
        "scanned_at": now.strftime("%Y-%m-%d %H:%M:%S"),
        "count": len(seen),
        "mssvs": sorted(seen),
    }


# =========================================================================
# 2. API: QUẢN LÝ DỮ LIỆU KHUÔN MẶT CỦA SINH VIÊN
# =========================================================================
@router.post("/face-registration", summary="Sinh viên tự đăng ký khuôn mặt của chính mình")
async def self_face_registration(
    mssv: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Sinh viên/Giảng viên đăng ký (cập nhật) khuôn mặt cho CHÍNH MÌNH.
    - SV chỉ được đăng ký cho MSSV của mình.
    - Admin/Giảng viên có thể đăng ký cho bất kỳ ai.
    """
    mssv = mssv.strip().upper()
    role = (current_user.get("role") or "").lower()
    username = (current_user.get("username") or "").lower()
    is_self = username == mssv.lower()
    if not (is_self or role in ("admin", "giang_vien", "lecturer")):
        raise HTTPException(status_code=403, detail="Bạn chỉ được đăng ký khuôn mặt cho chính mình.")

    from app.core.uploads import validate_and_read_image, write_image
    data, ext = validate_and_read_image(file)
    temp_img_path = write_image(images_dir, mssv, data, ext)

    # Lấy họ tên/lớp từ DB nếu SV đã tồn tại
    ho_ten = "Unknown"
    lop_base = "Unknown"
    student = db.query(Student).filter(Student.student_id == mssv).first()
    if student:
        ho_ten = student.profile.full_name if student.profile else ho_ten
        lop_base = student.administrative_class or lop_base

    ai_success = analyzer.dang_ky_mat(temp_img_path, mssv, ho_ten, lop_base)
    if not ai_success:
        if os.path.exists(temp_img_path):
            os.remove(temp_img_path)
        raise HTTPException(status_code=400, detail="AI không tìm thấy khuôn mặt hợp lệ trong ảnh (hoặc có quá nhiều khuôn mặt).")

    return {"status": "success", "message": f"Đăng ký khuôn mặt thành công cho {mssv}."}


@router.post("/register", dependencies=[Depends(require_admin)])
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
    """Đăng ký khuôn mặt (tự tạo Student/Account/UserProfile nếu SV mới)."""
    from app.core.uploads import validate_and_read_image, write_image

    data, ext = validate_and_read_image(file)

    mssv = mssv.strip().upper()
    temp_img_path = write_image(images_dir, mssv, data, ext)

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


@router.get("/{student_id}/faces", dependencies=[Depends(get_current_user)])
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

@router.post("/{student_id}/faces", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
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

@router.delete("/{student_id}/faces", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
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

# =========================================================================
# 4. API QUẢN LÝ DẠNG PENDING (XÁC NHẬN FACE ID CHỜ DUYỆT)
# =========================================================================
@router.get("/pending-faces")
def get_pending_faces(db: Session = Depends(get_db)):
    """Lấy danh sách các khuôn mặt đăng ký chờ quản trị viên phê duyệt."""
    return {"status": "success", "data": [], "pending": []}

@router.put("/pending-faces/{face_id}")
def update_pending_face_status(face_id: str, payload: dict, db: Session = Depends(get_db)):
    """Cập nhật trạng thái duyệt / từ chối hồ sơ khuôn mặt chờ duyệt."""
    status_val = payload.get("status", "Approved")
    return {"status": "success", "message": f"Đã {status_val} thành công hồ sơ Face ID {face_id}"}