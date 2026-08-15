"""Tính báo cáo tổng kết điểm danh cho một lớp tín chỉ (dùng chung cho API & export).

- Truy vấn gộp (không N+1): toàn bộ attendance + đơn nghỉ phép của lớp trong 2 query.
- Đơn nghỉ phép đang chờ duyệt (Pending) KHÔNG tính là vắng không phép.
- Trạng thái chuẩn:
    Có mặt   : "Đúng giờ", "Có mặt"
    Đi muộn  : "Đi muộn"
    Có phép  : "Có phép"
    Vắng KP  : "Vắng không phép", "Vắng"
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

import unicodedata

from app.models.class_schedule import ClassSchedule
from app.models.student_class import StudentClassEnrollment
from app.models.attendance_history import AttendanceHistory
from app.models.attendance_record import AttendanceRecord
from app.models.class_session import ClassSession
from app.models.leave_request import LeaveRequest

# --- Trạng thái điểm danh (chuẩn hóa chung cho AI + thủ công) ---
# Điểm danh AI ghi tiếng Việt; điểm danh thủ công ghi tiếng Anh (Present/Late/...)
# => gộp cả 2 vào bộ trạng thái để báo cáo đếm ĐÚNG ở mọi nơi.
CO_MAT = {"Đúng giờ", "Có mặt", "Co mat", "Co Mat", "Present", "On time"}
DI_MUON = {"Đi muộn", "Di muon", "Di muộn", "Late"}
CO_PHEP = {"Có phép", "Co phep", "Excused"}
VANG_KP = {"Vắng không phép", "Vắng", "Vang khong phep", "Vang", "Absent"}


def normalize_status(status):
    """Bỏ dấu tiếng Việt + hạ thường để so khớp trạng thái không lệch dấu."""
    if not status:
        return ""
    s = unicodedata.normalize("NFD", str(status))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower().strip()
    return s


def is_present_status(status):
    """True nếu là trạng thái có mặt (Đúng giờ / Có mặt / Đi muộn)."""
    s = normalize_status(status)
    return s in {normalize_status(x) for x in CO_MAT | DI_MUON}

# Ngưỡng cấm thi: tỷ lệ vắng > 20%
CAM_THI_THRESHOLD = 20.0


def _cam_thi_threshold() -> float:
    """Ngưỡng cấm thi (tỷ lệ vắng %), đọc từ config.yaml nếu có."""
    try:
        from config.settings import settings
        val = settings.config.get("attendance", {}).get("cam_thi_threshold")
        if val:
            return float(val)
    except Exception:
        pass
    return CAM_THI_THRESHOLD


def _warning_threshold() -> float:
    """Ngưỡng cảnh báo (tỷ lệ vắng %): từ ngưỡng này -> cảnh báo trước khi cấm thi."""
    try:
        from config.settings import settings
        val = settings.config.get("attendance", {}).get("warning_threshold")
        if val:
            return float(val)
    except Exception:
        pass
    return 10.0


def class_status(ty_le_vang: float) -> str:
    """Trạng thái theo tỷ lệ vắng: Hợp lệ / Cảnh báo / Cấm thi."""
    if ty_le_vang > _cam_thi_threshold():
        return "Cấm thi"
    if ty_le_vang >= _warning_threshold():
        return "Cảnh báo"
    return "Hợp lệ"


def _parse_datetime(sched):
    """Trả về datetime của buổi học. Hỗ trợ cả 2 kiểu lịch sau merge:
    - Lịch theo ngày: study_date + start_time
    - Lịch template theo thứ: day_of_week + start_shift (không có ngày cụ thể)
    """
    study_date = getattr(sched, "study_date", None)
    start_time = getattr(sched, "start_time", None)
    if study_date is not None and start_time is not None:
        clean_time = str(start_time).strip()
        if len(clean_time) == 5:
            clean_time += ":00"
        try:
            return datetime.strptime(f"{study_date} {clean_time}", "%Y-%m-%d %H:%M:%S")
        except Exception:
            try:
                return datetime.combine(study_date, start_time)
            except Exception:
                pass

    # Lịch template (day_of_week 2-8, start_shift): ước lượng giờ theo quy ước shift = giờ - 6
    dow = getattr(sched, "day_of_week", None)
    shift = getattr(sched, "start_shift", None)
    if dow is not None and shift is not None:
        try:
            today = datetime.now().date()
            offset = 6 if int(dow) == 8 else int(dow) - 2  # Mon=0
            days_ahead = (offset - today.weekday()) % 7
            d = today + timedelta(days=days_ahead)
            return datetime(d.year, d.month, d.day, min(6 + int(shift), 23), 0)
        except Exception:
            pass

    # Không xác định được thời gian -> coi là đã qua để không làm crash báo cáo
    return datetime.now()


def build_class_report(db: Session, ma_lop_tc: str, from_date: str = None, to_date: str = None) -> dict:
    """Trả về dict: {"total_sessions", "report": [ ... ]}.

    Nguồn buổi học chuẩn là class_sessions (lịch thật camera/UI dùng);
    vẫn gộp điểm danh từ class_schedules + attendance_histories (lịch cũ) theo ngày.
    """
    now = datetime.now()

    # 1. Buổi học thật (class_sessions)
    session_query = db.query(ClassSession).filter(ClassSession.class_id == ma_lop_tc.strip())
    if from_date:
        session_query = session_query.filter(ClassSession.session_date >= from_date)
    if to_date:
        session_query = session_query.filter(ClassSession.session_date <= to_date)
    sessions = session_query.order_by(ClassSession.session_date, ClassSession.start_time).all()
    session_ids = [s.session_id for s in sessions]
    total_sessions = len(session_ids)

    # 2. Lịch cũ (class_schedules) để map attendance_history + đơn nghỉ phép theo ngày
    schedules = db.query(ClassSchedule).filter(ClassSchedule.class_id == ma_lop_tc.strip()).all()
    sched_date_map = {}   # schedule_id -> date
    for s in schedules:
        try:
            sched_date_map[s.schedule_id] = _parse_datetime(s).date()
        except Exception:
            pass
    schedule_ids = list(sched_date_map.keys())

    enrollments = db.query(StudentClassEnrollment).filter(
        StudentClassEnrollment.class_id == ma_lop_tc.strip()
    ).all()
    report = []
    if not enrollments:
        return {"total_sessions": total_sessions, "report": report}

    student_ids = [e.student_id for e in enrollments]

    # 3. Điểm danh theo buổi thật (attendance_records)
    rec_map = {}    # (student_id, session_id) -> status
    src_map = {}    # (student_id, session_id) -> source (AI/manual)
    if total_sessions > 0:
        att_rec_rows = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id.in_(student_ids),
            AttendanceRecord.session_id.in_(session_ids)
        ).all()
        for r in att_rec_rows:
            rec_map[(r.student_id, r.session_id)] = r.status
            src_map[(r.student_id, r.session_id)] = r.source

    # 4. Điểm danh theo lịch cũ (attendance_histories) map theo ngày
    hist_map = {}   # (student_id, date) -> status
    if schedule_ids:
        att_hist_rows = db.query(AttendanceHistory).filter(
            AttendanceHistory.student_id.in_(student_ids),
            AttendanceHistory.schedule_id.in_(schedule_ids)
        ).all()
        for r in att_hist_rows:
            d = sched_date_map.get(r.schedule_id)
            if d:
                hist_map[(r.student_id, d)] = r.status

    # 5. Đơn nghỉ phép đang chờ duyệt (không tính vắng không phép)
    pending_leave = set()   # (student_id, date)
    if schedule_ids:
        leave_records = db.query(LeaveRequest).filter(
            LeaveRequest.student_id.in_(student_ids),
            LeaveRequest.schedule_id.in_(schedule_ids),
            LeaveRequest.status == "Pending"
        ).all()
        for lr in leave_records:
            d = sched_date_map.get(lr.schedule_id)
            if d:
                pending_leave.add((lr.student_id, d))

    for e in enrollments:
        student = e.student
        if not student:
            continue

        co_mat = di_muon = co_phep = vang_kp = pending_cnt = 0
        ai_count = manual_count = 0
        for s in sessions:
            key = (student.student_id, s.session_id)
            status = rec_map.get(key)
            src = src_map.get(key)
            if not status:
                status = hist_map.get((student.student_id, s.session_date))
            if status:
                if src == "manual":
                    manual_count += 1
                else:
                    ai_count += 1
                ns = normalize_status(status)
                if ns in {normalize_status(x) for x in CO_MAT}:
                    co_mat += 1
                elif ns in {normalize_status(x) for x in DI_MUON}:
                    di_muon += 1
                elif ns in {normalize_status(x) for x in CO_PHEP}:
                    co_phep += 1
                elif ns in {normalize_status(x) for x in VANG_KP}:
                    vang_kp += 1
                else:
                    co_mat += 1  # trạng thái lạ mặc định coi như có mặt
            else:
                # Buổi đã qua chưa có bản ghi: chờ duyệt thì không tính vắng
                if (student.student_id, s.session_date) in pending_leave:
                    pending_cnt += 1
                elif s.start_time < now:
                    vang_kp += 1

        # Điểm chuyên cần: bắt đầu 10.0, trừ 0.5 đi muộn, trừ 1.0 vắng không phép
        score = round(max(0.0, 10.0 - (di_muon * 0.5) - (vang_kp * 1.0)), 1)

        # Tỷ lệ vắng: (vắng không phép + vắng có phép) / tổng buổi
        total_absent = vang_kp + co_phep
        ty_le_vang = round((total_absent / total_sessions) * 100, 1) if total_sessions > 0 else 0.0

        trang_thai = class_status(ty_le_vang)

        report.append({
            "mssv": student.student_id,
            "ho_ten": student.profile.full_name if student.profile else "N/A",
            "lop_base": student.administrative_class or "N/A",
            "tong_buoi": total_sessions,
            "co_mat": co_mat,
            "di_muon": di_muon,
            "co_phep": co_phep,
            "vang_kp": vang_kp,
            "cho_duyet": pending_cnt,
            "ai_count": ai_count,
            "manual_count": manual_count,
            "score": score,
            "ty_le_vang": ty_le_vang,
            "trang_thai": trang_thai,
        })

    return {"total_sessions": total_sessions, "report": report}


def build_classes_summary(db: Session, classes) -> dict:
    """Tổng hợp báo cáo cho một danh sách lớp tín chỉ (dùng cho cấp Giảng viên/Môn học).

    Trả về: tong_lop, tong_sv, tong_buoi_hoc, so_sv_cam_thi,
            at_risk (danh sách SV cấm thi), classes (tóm tắt từng lớp).
    """
    class_summaries = []
    at_risk = []
    total_students = 0
    total_schedules = 0

    for cc in classes:
        data = build_class_report(db, cc.class_id)
        total_schedules += data["total_sessions"]
        students = data["report"]
        total_students += len(students)

        present = sum(s["co_mat"] for s in students)
        late = sum(s["di_muon"] for s in students)
        absent = sum(s["vang_kp"] for s in students)

        banned = [s for s in students if s["trang_thai"] == "Cấm thi"]
        at_risk.extend({
            "mssv": s["mssv"],
            "ho_ten": s["ho_ten"],
            "lop_base": s["lop_base"],
            "ma_lop_tc": cc.class_id,
            "ty_le_vang": s["ty_le_vang"],
            "score": s["score"],
        } for s in banned)

        class_summaries.append({
            "ma_lop_tc": cc.class_id,
            "subject_id": cc.subject_id,
            "subject_name": cc.subject.subject_name if cc.subject else "N/A",
            "lecturer_id": cc.lecturer_id,
            "lecturer_name": cc.lecturer.full_name if cc.lecturer else "N/A",
            "so_sv": len(students),
            "tong_buoi": data["total_sessions"],
            "co_mat": present,
            "di_muon": late,
            "vang_kp": absent,
            "so_cam_thi": len(banned),
        })

    return {
        "tong_lop": len(classes),
        "tong_sv": total_students,
        "tong_buoi_hoc": total_schedules,
        "so_sv_cam_thi": len(at_risk),
        "at_risk": sorted(at_risk, key=lambda x: -x["ty_le_vang"]),
        "classes": class_summaries,
    }


def build_subject_dashboard(db: Session, classes) -> dict:
    """Dashboard thống kê theo MÔN HỌC cho giảng viên (gộp các lớp cùng môn).

    Trả về: subjects (từng môn), totals, at_risk (SV cấm thi/cảnh báo).
    """
    subjects = {}
    for cc in classes:
        if cc is None:
            continue
        sub_id = cc.subject_id or "N/A"
        sub = subjects.setdefault(sub_id, {
            "subject_id": sub_id,
            "subject_name": cc.subject.subject_name if cc.subject else "N/A",
            "so_lop": 0, "tong_sv": 0, "tong_buoi": 0,
            "co_mat": 0, "di_muon": 0, "vang_kp": 0, "co_phep": 0,
            "so_canh_bao": 0, "so_cam_thi": 0,
        })
        data = build_class_report(db, cc.class_id)
        students = data["report"]
        sub["so_lop"] += 1
        sub["tong_buoi"] += data["total_sessions"]
        sub["tong_sv"] += len(students)
        sub["co_mat"] += sum(s["co_mat"] for s in students)
        sub["di_muon"] += sum(s["di_muon"] for s in students)
        sub["vang_kp"] += sum(s["vang_kp"] for s in students)
        sub["co_phep"] += sum(s["co_phep"] for s in students)
        sub["so_cam_thi"] += sum(1 for s in students if s["trang_thai"] == "Cấm thi")
        sub["so_canh_bao"] += sum(1 for s in students if s["trang_thai"] == "Cảnh báo")

    subjects_list = sorted(subjects.values(), key=lambda x: (-x["tong_sv"], x["subject_name"]))
    totals = {
        "so_mon": len(subjects_list),
        "so_lop": sum(s["so_lop"] for s in subjects_list),
        "tong_sv": sum(s["tong_sv"] for s in subjects_list),
        "tong_buoi": sum(s["tong_buoi"] for s in subjects_list),
        "co_mat": sum(s["co_mat"] for s in subjects_list),
        "di_muon": sum(s["di_muon"] for s in subjects_list),
        "vang_kp": sum(s["vang_kp"] for s in subjects_list),
        "co_phep": sum(s["co_phep"] for s in subjects_list),
        "so_canh_bao": sum(s["so_canh_bao"] for s in subjects_list),
        "so_cam_thi": sum(s["so_cam_thi"] for s in subjects_list),
    }

    # Danh sách SV cấm thi / cảnh báo gộp theo môn
    at_risk = []
    for cc in classes:
        if cc is None:
            continue
        data = build_class_report(db, cc.class_id)
        sub_id = cc.subject_id or "N/A"
        for s in data["report"]:
            if s["trang_thai"] in ("Cấm thi", "Cảnh báo"):
                at_risk.append({
                    "mssv": s["mssv"], "ho_ten": s["ho_ten"], "lop_base": s["lop_base"],
                    "ma_lop_tc": cc.class_id, "subject_id": sub_id,
                    "subject_name": cc.subject.subject_name if cc.subject else sub_id,
                    "ty_le_vang": s["ty_le_vang"], "score": s["score"],
                    "trang_thai": s["trang_thai"],
                })
    at_risk.sort(key=lambda x: (-x["ty_le_vang"]))

    return {
        "subjects": subjects_list,
        "totals": totals,
        "at_risk": at_risk,
    }


def build_student_summary(db: Session, student_id: str) -> dict | None:
    """Báo cáo tổng kết cá nhân của một sinh viên trên tất cả lớp đang học.

    Trả về None nếu SV không tồn tại. Ngược lại trả về:
      student, classes (từng lớp), totals, cam_thi (bool), at_risk.
    """
    from app.models.student import Student
    from app.models.student_class import StudentClassEnrollment

    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        return None

    enrollments = db.query(StudentClassEnrollment).filter(
        StudentClassEnrollment.student_id == student_id
    ).all()

    classes = []
    total_sessions = 0
    total_absent = 0
    cam_thi = False
    for e in enrollments:
        cc = e.credit_class
        if not cc:
            continue
        data = build_class_report(db, cc.class_id)
        row = next((r for r in data["report"] if r["mssv"] == student_id), None)
        total_sessions += data["total_sessions"]
        if row:
            total_absent += row["vang_kp"] + row["co_phep"]
            if row["trang_thai"] == "Cấm thi":
                cam_thi = True
            classes.append({
                "ma_lop_tc": cc.class_id,
                "subject_id": cc.subject_id,
                "subject_name": cc.subject.subject_name if cc.subject else "N/A",
                "lecturer_name": cc.lecturer.full_name if cc.lecturer else "N/A",
                **row,
            })

    return {
        "student": {
            "mssv": student.student_id,
            "ho_ten": student.profile.full_name if student.profile else "N/A",
            "lop_base": student.administrative_class or "N/A",
            "cohort": student.cohort or "N/A",
        },
        "classes": classes,
        "totals": {
            "so_lop": len(classes),
            "tong_buoi": total_sessions,
            "tong_vang": total_absent,
        },
        "cam_thi": cam_thi,
    }
