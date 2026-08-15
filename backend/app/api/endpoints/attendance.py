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
        from app.core.attendance_report import class_status
        for e in enrollments:
            student = e.student
            if not student: continue
            di_muon = 0; vang_kp = 0; co_phep = 0
            ai_count = 0; manual_count = 0

            rec_map = {}
            if total_sessions > 0:
                attendance_records = db.query(AttendanceRecord).filter(
                    AttendanceRecord.student_id == student.student_id, AttendanceRecord.session_id.in_(session_ids)
                ).all()
                attended_session_ids = set()
                for record in attendance_records:
                    attended_session_ids.add(record.session_id)
                    rec_map[record.session_id] = _fmt_status(record.status)
                    if record.source == "manual":
                        manual_count += 1
                    else:
                        ai_count += 1
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
                "ai_count": ai_count, "manual_count": manual_count,
                "score": score, "ty_le_vang": ty_le_vang, "trang_thai": class_status(ty_le_vang)
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


@router.get("/credit-classes/{class_id}/attendance/report/export",
            summary="Xuất Excel báo cáo điểm danh lớp (file .xlsx thật)")
def export_class_attendance_report(class_id: str, db: Session = Depends(get_db),
                                   current_user: dict = Depends(get_current_user)):
    """Xuất báo cáo điểm danh lớp ra file Excel (.xlsx) — dùng cho GV/Admin."""
    try:
        _ensure_teacher_of_class(db, class_id, current_user)

        from app.core.attendance_report import build_class_report
        from app.core.excel import build_excel_response

        data = build_class_report(db, class_id.strip())
        rows = []
        for r in data["report"]:
            rows.append({
                "MSSV": r["mssv"],
                "Họ và tên": r["ho_ten"],
                "Lớp HC": r["lop_base"],
                "Tổng buổi": r["tong_buoi"],
                "Có mặt": r["co_mat"],
                "Đi muộn": r["di_muon"],
                "Có phép": r["co_phep"],
                "Vắng KP": r["vang_kp"],
                "Điểm danh tự động": r.get("ai_count", 0),
                "Điểm danh thủ công": r.get("manual_count", 0),
                "Điểm CC": r["score"],
                "Tỷ lệ vắng (%)": r["ty_le_vang"],
                "Trạng thái": r["trang_thai"],
            })
        columns = ["MSSV", "Họ và tên", "Lớp HC", "Tổng buổi", "Có mặt", "Đi muộn",
                   "Có phép", "Vắng KP", "Điểm danh tự động", "Điểm danh thủ công",
                   "Điểm CC", "Tỷ lệ vắng (%)", "Trạng thái"]
        return build_excel_response(f"diem_danh_{class_id.strip()}.xlsx", rows, columns)
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Lỗi: {err}")

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
        # Chuẩn hóa trạng thái về TIẾNG VIỆT để đồng bộ với điểm danh AI
        # (Present/Late/Excused/Absent -> Có mặt/Đi muộn/Có phép/Vắng không phép)
        status_norm = _STATUS_MAP.get(trang_thai, trang_thai)
        if existing:
            existing.status = status_norm; existing.notes = f"Sửa bởi {nguoi_xac_nhan or 'GV'}"
            existing.recorded_at = datetime.now()
            existing.source = "manual"
        else:
            new_att = AttendanceRecord(student_id=mssv_clean, session_id=session_id, status=status_norm, notes=f"ĐD bởi {nguoi_xac_nhan or 'GV'}", recorded_at=datetime.now(), source="manual")
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
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi: {e}")


def _ensure_teacher_of_class(db, class_id: str, current_user: dict):
    """Giảng viên chỉ được thao tác lớp mình dạy; Admin được phép mọi lớp."""
    role = (current_user.get("role") or "").lower()
    if role == "admin":
        return
    lecturer_id = (current_user.get("lecturer_id") or "").strip()
    if not lecturer_id:
        raise HTTPException(status_code=403, detail="Tài khoản giảng viên chưa gắn mã giảng viên.")
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
    if not cc:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp tín chỉ.")
    if (cc.lecturer_id or "").strip().lower() != lecturer_id.lower():
        raise HTTPException(status_code=403, detail="Bạn không giảng dạy lớp này.")


_STATUS_MAP = {
    "Present": "Có mặt", "On time": "Có mặt", "Đúng giờ": "Có mặt", "Có mặt": "Có mặt", "Co mat": "Có mặt",
    "Late": "Đi muộn", "Đi muộn": "Đi muộn", "Di muon": "Đi muộn",
    "Excused": "Có phép", "Có phép": "Có phép", "Co phep": "Có phép",
    "Absent": "Vắng không phép", "Vắng": "Vắng không phép", "Vắng KP": "Vắng không phép", "Vang": "Vắng không phép",
}
_PRESENT = {"Có mặt"}
_LATE = {"Đi muộn"}
_EXCUSED = {"Có phép"}
_ABSENT = {"Vắng không phép"}


def _norm_status(st):
    return _STATUS_MAP.get(st, st or "Chưa điểm danh")


@router.get("/attendance/classes/{class_id}/sessions/{session_id}/roster",
            summary="Danh sách SV lớp cho điểm danh thủ công (có trạng thái + thống kê vắng)")
def get_class_roster(
    class_id: str, session_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trả về toàn bộ SV đăng ký lớp + trạng thái điểm danh của buổi được chọn.

    - students: từng SV (mssv, ho_ten, lop_base, status, source) để bấm điểm danh.
    - summary: tổng SV, đã điểm danh, có mặt, muộn, có phép, vắng, chưa điểm danh.
    - absent_list: danh sách SV vắng không phép.
    """
    try:
        sched = db.query(ClassSession).filter(ClassSession.session_id == session_id).first()
        if not sched:
            raise HTTPException(status_code=404, detail="Không tìm thấy buổi học.")
        if sched.class_id.strip() != class_id.strip():
            raise HTTPException(status_code=400, detail="Buổi học không thuộc lớp đã chọn.")
        _ensure_teacher_of_class(db, class_id, current_user)

        enrollments = db.query(StudentClassEnrollment).filter(
            StudentClassEnrollment.class_id == class_id.strip()).all()
        student_ids = [e.student_id for e in enrollments]
        # Fallback cho danh sách đăng ký cũ (ClassEnrollment)
        if not student_ids:
            legacy = db.query(ClassEnrollment).filter(ClassEnrollment.class_id == class_id.strip()).all()
            student_ids = [e.student_id for e in legacy]

        rec_map = {}
        if student_ids:
            rows = db.query(AttendanceRecord).filter(
                AttendanceRecord.session_id == session_id,
                AttendanceRecord.student_id.in_(student_ids),
            ).all()
            rec_map = {r.student_id: r for r in rows}

        students = []
        for e in enrollments:
            st = e.student
            if not st:
                continue
            rec = rec_map.get(st.student_id)
            status = _norm_status(rec.status) if rec else "Chưa điểm danh"
            students.append({
                "mssv": st.student_id,
                "ho_ten": st.profile.full_name if st.profile else "N/A",
                "lop_base": st.administrative_class or "N/A",
                "status": status,
                "source": (rec.source or "AI") if rec else None,
                "recorded_at": rec.recorded_at.strftime("%H:%M") if (rec and rec.recorded_at) else None,
            })

        summary = {"tong_sv": len(students)}
        for key, st_set in (("co_mat", _PRESENT), ("di_muon", _LATE), ("co_phep", _EXCUSED), ("vang_kp", _ABSENT)):
            summary[key] = sum(1 for s in students if s["status"] in st_set)
        summary["chua_diem_danh"] = sum(1 for s in students if s["status"] == "Chưa điểm danh")
        summary["da_diem_danh"] = summary["tong_sv"] - summary["chua_diem_danh"]

        absent_list = [s for s in students if s["status"] in _ABSENT]

        return {
            "status": "success",
            "class_id": class_id,
            "session": {
                "session_id": sched.session_id,
                "session_date": str(sched.session_date),
                "start_time": sched.start_time.strftime("%H:%M") if sched.start_time else "—",
                "end_time": sched.end_time.strftime("%H:%M") if sched.end_time else "—",
                "room_id": sched.room_id,
            },
            "summary": summary,
            "absent_list": absent_list,
            "students": students,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")


@router.get("/attendance/lecturer/today", summary="Các buổi học hôm nay của giảng viên (trực quan)")
def lecturer_today_sessions(
    lecturer_id: Optional[str] = Query(None, description="Mã GV (admin dùng; GV tự lấy từ token)."),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trả về các buổi học HÔM NAY của giảng viên (để GV xem nhanh ai đi học).

    Mỗi buổi kèm trạng thái: da_ket_thuc / dang_dien_ra / sap_dien_ra.
    """
    try:
        role = (current_user.get("role") or "").lower()
        if role in ("giang_vien", "lecturer"):
            lecturer_id = current_user.get("lecturer_id") or lecturer_id
        if not lecturer_id:
            return {"status": "success", "sessions": []}

        now = datetime.now()
        today = now.date()

        class_ids = [c.class_id for c in db.query(CreditClass).filter(
            func.lower(CreditClass.lecturer_id) == lecturer_id.strip().lower()).all()]

        sessions = db.query(ClassSession).filter(
            ClassSession.class_id.in_(class_ids),
            ClassSession.session_date == today,
        ).order_by(ClassSession.start_time).all()

        out = []
        for s in sessions:
            if s.end_time and now > s.end_time:
                st = "da_ket_thuc"
            elif s.start_time and now >= s.start_time:
                st = "dang_dien_ra"
            else:
                st = "sap_dien_ra"

            total = db.query(StudentClassEnrollment).filter(
                StudentClassEnrollment.class_id == s.class_id).count()
            co_mat = db.query(AttendanceRecord).filter(
                AttendanceRecord.session_id == s.session_id,
                AttendanceRecord.status.in_(["Đúng giờ", "Có mặt", "Đi muộn", "Present", "Late"]),
            ).count()
            vang = db.query(AttendanceRecord).filter(
                AttendanceRecord.session_id == s.session_id,
                AttendanceRecord.status.in_(["Vắng", "Vắng không phép", "Absent"]),
            ).count()

            cc = db.query(CreditClass).filter(CreditClass.class_id == s.class_id).first()
            out.append({
                "session_id": s.session_id,
                "class_id": s.class_id,
                "subject_name": cc.subject.subject_name if cc and cc.subject else s.class_id,
                "room_id": s.room_id,
                "start_time": s.start_time.strftime("%H:%M") if s.start_time else None,
                "end_time": s.end_time.strftime("%H:%M") if s.end_time else None,
                "status": st,
                "total": total,
                "co_mat": co_mat,
                "vang": vang,
            })
        return {"status": "success", "sessions": out}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")


@router.get("/attendance/classes/{class_id}/sessions",
            summary="Tổng kết điểm danh theo từng buổi của lớp")
def class_sessions_summary(
    class_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Danh sách buổi học của lớp kèm số SV có mặt / vắng từng buổi (cho GV)."""
    try:
        _ensure_teacher_of_class(db, class_id, current_user)
        sessions = db.query(ClassSession).filter(ClassSession.class_id == class_id.strip()) \
            .order_by(ClassSession.session_date, ClassSession.start_time).all()

        total_enrolled = db.query(StudentClassEnrollment).filter(
            StudentClassEnrollment.class_id == class_id.strip()).count()
        if not total_enrolled:
            total_enrolled = db.query(ClassEnrollment).filter(
                ClassEnrollment.class_id == class_id.strip()).count()

        out = []
        for s in sessions:
            recs = db.query(AttendanceRecord).filter(AttendanceRecord.session_id == s.session_id).all()
            co_mat = sum(1 for r in recs if _norm_status(r.status) in _PRESENT | _LATE)
            vang_kp = sum(1 for r in recs if _norm_status(r.status) in _ABSENT)
            out.append({
                "session_id": s.session_id,
                "session_date": str(s.session_date),
                "start_time": s.start_time.strftime("%H:%M") if s.start_time else "—",
                "end_time": s.end_time.strftime("%H:%M") if s.end_time else "—",
                "room_id": s.room_id,
                "total_enrolled": total_enrolled,
                "co_mat": co_mat,
                "vang_kp": vang_kp,
                "da_diem_danh": len(recs),
            })
        return {"status": "success", "sessions": out}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")

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