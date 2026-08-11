# File: app/api/endpoints/attendance.py
from fastapi import APIRouter, Depends, HTTPException, Form, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from app.db.session import get_db
from app.models import ClassSession, ClassEnrollment, AttendanceRecord
from app.core.require import get_current_user, require_roles

router = APIRouter()

@router.get("/credit-classes/{class_id}/attendance/report", summary="Get Class Attendance Report", dependencies=[Depends(require_roles("giang_vien", "admin"))])
def get_class_attendance_report(class_id: str, db: Session = Depends(get_db)):
    """Xuất báo cáo điểm danh chi tiết cho một lớp tín chỉ."""
    try:
        schedules = db.query(ClassSession).filter(ClassSession.class_id == class_id.strip()).all()
        session_ids = [s.session_id for s in schedules]
        total_sessions = len(schedules)
        
        enrollments = db.query(ClassEnrollment).filter(ClassEnrollment.class_id == class_id.strip()).all()
        report = []
        for e in enrollments:
            student = e.student
            if not student: continue
            di_muon = 0; vang_kp = 0; co_phep = 0
            
            if total_sessions > 0:
                attendance_records = db.query(AttendanceRecord).filter(
                    AttendanceRecord.student_id == student.student_id, AttendanceRecord.session_id.in_(session_ids)
                ).all()
                attended_session_ids = set()
                for record in attendance_records:
                    attended_session_ids.add(record.session_id)
                    if record.status == "Late": di_muon += 1
                    elif record.status == "Excused": co_phep += 1
                    elif record.status == "Absent": vang_kp += 1
                
                now = datetime.now()
                for s in schedules:
                    if s.start_time < now and s.session_id not in attended_session_ids: vang_kp += 1
            
            score = max(0.0, round(10.0 - (di_muon * 0.5) - (vang_kp * 1.0), 1))
            total_absent = vang_kp + co_phep
            ty_le_vang = round((total_absent / total_sessions) * 100, 1) if total_sessions > 0 else 0.0
            report.append({
                "mssv": student.student_id, "ho_ten": student.profile.full_name if student.profile else "N/A",
                "lop_base": student.administrative_class or "N/A", "di_muon": di_muon, "vang_kp": vang_kp, "co_phep": co_phep,
                "score": score, "ty_le_vang": ty_le_vang, "trang_thai": "Cấm thi" if ty_le_vang > 20.0 else "Hợp lệ"
            })
        return {"status": "success", "report": report}
    except Exception as err: raise HTTPException(status_code=500, detail=f"Lỗi: {err}")

@router.post("/attendance/manual-checkin", summary="Teacher Manual Checkin", dependencies=[Depends(require_roles("giang_vien", "admin"))])
def teacher_manual_checkin(
    mssv: str = Form(...), session_id: int = Form(...), trang_thai: str = Form(...),
    nguoi_xac_nhan: Optional[str] = Form(None), db: Session = Depends(get_db)
):
    """Cho phép Giảng viên điểm danh thủ công (Update/Create)."""
    try:
        sched = db.query(ClassSession).filter(ClassSession.session_id == session_id).first()
        if not sched: raise HTTPException(status_code=404, detail="Không tìm thấy buổi học.")
        existing = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == mssv.strip().upper(), AttendanceRecord.session_id == session_id).first()
        if existing:
            existing.status = trang_thai; existing.notes = f"Sửa bởi {nguoi_xac_nhan or 'GV'}"
            existing.recorded_at = datetime.now()
        else:
            new_att = AttendanceRecord(student_id=mssv.strip().upper(), session_id=session_id, status=trang_thai, notes=f"ĐD bởi {nguoi_xac_nhan or 'GV'}", recorded_at=datetime.now())
            db.add(new_att)
        db.commit()
        return {"status": "success", "message": "Thành công."}
    except Exception as e: db.rollback(); raise HTTPException(status_code=500, detail=f"Lỗi: {e}")

from app.models.account import Account

@router.get("/attendance", summary="Get Recent Attendance Logs", dependencies=[Depends(get_current_user)])
def get_recent_attendance_logs(
    mssv: Optional[str] = Query(None, description="Lọc theo MSSV."),
    status: Optional[str] = Query(None, description="Lọc theo trạng thái."),
    ma_lop_tc: Optional[str] = Query(None, description="Lọc theo mã lớp tín chỉ."),
    from_date: Optional[str] = Query(None, description="Từ ngày (YYYY-MM-DD)."),
    to_date: Optional[str] = Query(None, description="Đến ngày (YYYY-MM-DD)."),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lấy danh sách bản ghi điểm danh gần nhất (hỗ trợ lọc theo SV/lớp/ngày)."""
    query = db.query(AttendanceRecord)

    # Ràng buộc quyền: Sinh viên chỉ xem log của chính mình
    user_role = (current_user.get("role") or "").lower()
    if user_role in ("sinh_vien", "student"):
        user_mssv = (current_user.get("username") or "").upper()
        if mssv and mssv.strip().upper() != user_mssv:
            raise HTTPException(status_code=403, detail="Sinh viên chỉ được phép xem nhật ký điểm danh của chính mình.")
        mssv = user_mssv

    if mssv:
        query = query.filter(AttendanceRecord.student_id == mssv.strip().upper())
    if status:
        query = query.filter(AttendanceRecord.status == status.strip())
    if ma_lop_tc:
        query = query.join(ClassSession, AttendanceRecord.session_id == ClassSession.session_id)\
                     .filter(ClassSession.class_id == ma_lop_tc.strip())
    if from_date:
        query = query.filter(AttendanceRecord.recorded_at >= f"{from_date} 00:00:00")
    if to_date:
        query = query.filter(AttendanceRecord.recorded_at <= f"{to_date} 23:59:59")

    total = query.count()
    rows = query.order_by(AttendanceRecord.recorded_at.desc()).offset(offset).limit(limit).all()
    logs_data = [{
        "id": l.record_id,
        "mssv": l.student_id,
        "fullname": l.student.profile.full_name if (l.student and l.student.profile) else "N/A",
        "lop_base": l.student.administrative_class if l.student else "N/A",
        "ma_buoi_hoc": l.session_id,
        "timestamp": l.recorded_at.strftime("%Y-%m-%d %H:%M:%S") if l.recorded_at else "N/A",
        "trang_thai": l.status,
    } for l in rows]
    return {"logs": logs_data, "total": total, "offset": offset, "limit": limit}