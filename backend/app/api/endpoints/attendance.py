# File: app/api/endpoints/attendance.py
from fastapi import APIRouter, Depends, HTTPException, Form, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from app.db.session import get_db
from app.models import ClassSession, ClassEnrollment, AttendanceRecord, CreditClass, Student
from app.models.presence_snapshot import PresenceSnapshot
from app.models.student_class import StudentClassEnrollment
from app.core.require import get_current_user, require_roles

def _checkout_enabled() -> bool:
    """Đọc cấu hình bật/tắt check-out từ config.yaml."""
    try:
        from config.settings import settings
        return bool(settings.config.get("attendance", {}).get("enable_checkout", False))
    except Exception:
        return False

router = APIRouter()

@router.get("/credit-classes/{class_id}/attendance/report", summary="Get Class Attendance Report", dependencies=[Depends(require_roles("giang_vien", "admin"))])
def get_class_attendance_report(class_id: str, db: Session = Depends(get_db)):
    """Xuất báo cáo điểm danh chi tiết cho một lớp tín chỉ.

    Trả về: report (tổng hợp từng SV) + sessions (danh sách buổi)
            + matrix (trạng thái SV theo từng buổi).
    """
    try:
        schedules = db.query(ClassSession).filter(ClassSession.class_id == class_id.strip()).all()
        schedules.sort(key=lambda s: (s.session_date, s.start_time))
        session_ids = [s.session_id for s in schedules]
        total_sessions = len(schedules)

        def _fmt_status(st):
            return {
                "Present": "Đúng giờ", "On time": "Đúng giờ", "Đúng giờ": "Đúng giờ",
                "Late": "Đi muộn", "Đi muộn": "Đi muộn",
                "Excused": "Có phép", "Có phép": "Có phép",
                "Absent": "Vắng", "Vắng": "Vắng", "Vắng KP": "Vắng",
            }.get(st, st or "—")

        enrollments = db.query(StudentClassEnrollment).filter(StudentClassEnrollment.class_id == class_id.strip()).all()
        report = []
        matrix = []
        now = datetime.now()
        for e in enrollments:
            student = e.student
            if not student: continue
            di_muon = 0; vang_kp = 0; co_phep = 0

            rec_map = {}
            if total_sessions > 0:
                attendance_records = db.query(AttendanceRecord).filter(
                    AttendanceRecord.student_id == student.student_id, AttendanceRecord.session_id.in_(session_ids)
                ).all()
                attended_session_ids = set()
                for record in attendance_records:
                    attended_session_ids.add(record.session_id)
                    rec_map[record.session_id] = _fmt_status(record.status)
                    if record.status in ("Late", "Đi muộn"): di_muon += 1
                    elif record.status in ("Excused", "Có phép"): co_phep += 1
                    elif record.status in ("Absent", "Vắng", "Vắng KP"): vang_kp += 1

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
            # Ma trận: trạng thái SV tại từng buổi
            row = {}
            for s in schedules:
                if s.session_id in rec_map:
                    row[str(s.session_id)] = rec_map[s.session_id]
                elif s.start_time < now:
                    row[str(s.session_id)] = "Vắng"
                else:
                    row[str(s.session_id)] = "—"
            matrix.append({
                "mssv": student.student_id,
                "ho_ten": student.profile.full_name if student.profile else "N/A",
                "cells": row,
            })

        sessions = [{
            "session_id": s.session_id,
            "session_date": str(s.session_date),
            "start_time": s.start_time.strftime("%H:%M") if s.start_time else "—",
            "end_time": s.end_time.strftime("%H:%M") if s.end_time else "—",
        } for s in schedules]

        return {"status": "success", "report": report, "sessions": sessions, "matrix": matrix}
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

        # Kiểm tra SV thuộc lớp của buổi học (chống điểm danh bừa)
        mssv_clean = mssv.strip().upper()
        enrolled = db.query(StudentClassEnrollment).filter(
            StudentClassEnrollment.class_id == sched.class_id,
            StudentClassEnrollment.student_id == mssv_clean
        ).first()
        if not enrolled:
            enrolled = db.query(ClassEnrollment).filter(
                ClassEnrollment.class_id == sched.class_id,
                ClassEnrollment.student_id == mssv_clean
            ).first()
        if not enrolled:
            raise HTTPException(status_code=400,
                                detail=f"Sinh viên {mssv_clean} không thuộc lớp {sched.class_id} của buổi học này.")

        existing = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == mssv_clean, AttendanceRecord.session_id == session_id).first()
        if existing:
            existing.status = trang_thai; existing.notes = f"Sửa bởi {nguoi_xac_nhan or 'GV'}"
            existing.recorded_at = datetime.now()
        else:
            new_att = AttendanceRecord(student_id=mssv_clean, session_id=session_id, status=trang_thai, notes=f"ĐD bởi {nguoi_xac_nhan or 'GV'}", recorded_at=datetime.now())
            db.add(new_att)
        db.commit()

        # Gửi thông báo cho sinh viên sau khi điểm danh thành công
        try:
            from app.models.account import Account
            from app.core.notify import notify
            acc = db.query(Account).filter(Account.username == mssv.strip().lower()).first()
            if acc:
                label = {
                    "Present": "Có mặt", "Late": "Đi muộn",
                    "Excused": "Có phép", "Absent": "Vắng mặt",
                }.get(trang_thai, trang_thai)
                ntype = (
                    "success" if trang_thai in ("Present", "Đúng giờ", "Có mặt")
                    else "warning" if trang_thai == "Late"
                    else "danger" if trang_thai == "Absent"
                    else "info"
                )
                notify(db, acc.username, f"Đã điểm danh: {label}",
                       f"Giảng viên xác nhận buổi học số {session_id}.", ntype=ntype)
        except Exception:
            pass

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
    logs_data = []
    for l in rows:
        check_out = l.check_out_time
        recorded = l.recorded_at
        duration_min = None
        if recorded:
            end = check_out or datetime.now()
            duration_min = round((end - recorded).total_seconds() / 60.0, 1)
        logs_data.append({
            "id": l.record_id,
            "mssv": l.student_id,
            "fullname": l.student.profile.full_name if (l.student and l.student.profile) else "N/A",
            "lop_base": l.student.administrative_class if l.student else "N/A",
            "ma_buoi_hoc": l.session_id,
            "timestamp": l.recorded_at.strftime("%Y-%m-%d %H:%M:%S") if l.recorded_at else "N/A",
            "trang_thai": l.status,
            "check_out_time": check_out.strftime("%Y-%m-%d %H:%M:%S") if check_out else None,
            "is_present": check_out is None,
            "duration_min": duration_min,
        })
    return {"logs": logs_data, "total": total, "offset": offset, "limit": limit,
            "checkout_enabled": _checkout_enabled()}


from sqlalchemy import func


@router.get("/live-presence", summary="Giảng viên xem số SV đang có mặt (theo camera thụ động)")
def live_presence(
    lecturer_id: Optional[str] = Query(None, description="Mã giảng viên (admin dùng; GV tự lấy từ token)."),
    session_id: Optional[int] = Query(None, description="Mã buổi học cụ thể."),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trả về buổi học đang diễn ra + số SV đang có mặt theo snapshot thụ động mới nhất."""
    try:
        role = (current_user.get("role") or "").lower()
        if role in ("giang_vien", "lecturer"):
            lecturer_id = current_user.get("lecturer_id") or lecturer_id
        if not lecturer_id and not session_id:
            return {"status": "failed", "message": "Thiếu lecturer_id hoặc session_id."}

        now = datetime.now()
        session = None
        if session_id:
            session = db.query(ClassSession).filter(ClassSession.session_id == session_id).first()
        elif lecturer_id:
            q = db.query(ClassSession).join(CreditClass).filter(
                func.lower(CreditClass.lecturer_id) == lecturer_id.strip().lower(),
                ClassSession.session_date == now.date(),
            )
            for s in q.all():
                if s.start_time - timedelta(minutes=30) <= now <= s.end_time:
                    session = s
                    break
        if not session:
            return {"status": "success", "has_session": False,
                    "message": "Hiện không có buổi học nào đang diễn ra."}

        total = db.query(StudentClassEnrollment).filter(StudentClassEnrollment.class_id == session.class_id).count()

        # 2 lần quét snapshot gần nhất để so sánh ai vừa vào / vừa rời
        scan_times = [r[0] for r in db.query(PresenceSnapshot.scanned_at)
                      .filter(PresenceSnapshot.session_id == session.session_id)
                      .distinct().order_by(PresenceSnapshot.scanned_at.desc()).limit(2).all()]

        def _mssv_at(t):
            if not t:
                return set()
            return {r.mssv for r in db.query(PresenceSnapshot)
                    .filter(PresenceSnapshot.session_id == session.session_id,
                            PresenceSnapshot.scanned_at == t).all()}

        latest_scan = scan_times[0] if scan_times else None
        present_mssvs = _mssv_at(latest_scan)
        prev_mssvs = _mssv_at(scan_times[1] if len(scan_times) > 1 else None)
        just_arrived = present_mssvs - prev_mssvs
        just_left = prev_mssvs - present_mssvs

        def _names(mssvs):
            out = []
            for m in sorted(mssvs):
                st = db.query(Student).filter(Student.student_id == m).first()
                out.append({"mssv": m, "ho_ten": st.profile.full_name if (st and st.profile) else m})
            return out

        return {
            "status": "success",
            "has_session": True,
            "session": {
                "session_id": session.session_id,
                "class_id": session.class_id,
                "room_id": session.room_id,
                "session_date": str(session.session_date),
                "start_time": session.start_time.strftime("%H:%M") if session.start_time else None,
                "end_time": session.end_time.strftime("%H:%M") if session.end_time else None,
            },
            "total": total,
            "present_count": len(present_mssvs),
            "present_list": _names(present_mssvs),
            "just_arrived": _names(just_arrived),
            "just_left": _names(just_left),
            "scanned_at": latest_scan.strftime("%Y-%m-%d %H:%M:%S") if latest_scan else None,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")