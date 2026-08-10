"""Tính báo cáo tổng kết điểm danh cho một lớp tín chỉ (dùng chung cho API & export).

- Truy vấn gộp (không N+1): toàn bộ attendance + đơn nghỉ phép của lớp trong 2 query.
- Đơn nghỉ phép đang chờ duyệt (Pending) KHÔNG tính là vắng không phép.
- Trạng thái chuẩn:
    Có mặt   : "Đúng giờ", "Có mặt"
    Đi muộn  : "Đi muộn"
    Có phép  : "Có phép"
    Vắng KP  : "Vắng không phép", "Vắng"
"""
from datetime import datetime
from sqlalchemy.orm import Session

import unicodedata

from app.models.class_schedule import ClassSchedule
from app.models.student_class import StudentClassEnrollment
from app.models.attendance_history import AttendanceHistory
from app.models.leave_request import LeaveRequest

# --- Trạng thái điểm danh (chuẩn) ---
CO_MAT = {"Đúng giờ", "Có mặt", "Co mat", "Co Mat"}
DI_MUON = {"Đi muộn", "Di muon", "Di muộn"}
CO_PHEP = {"Có phép", "Co phep"}
VANG_KP = {"Vắng không phép", "Vắng", "Vang khong phep", "Vang"}


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


def _parse_datetime(sched):
    try:
        clean_time = str(sched.start_time).strip()
        if len(clean_time) == 5:
            clean_time += ":00"
        return datetime.strptime(f"{sched.study_date} {clean_time}", "%Y-%m-%d %H:%M:%S")
    except Exception:
        return datetime.combine(sched.study_date, sched.start_time)


def build_class_report(db: Session, ma_lop_tc: str, from_date: str = None, to_date: str = None) -> dict:
    """Trả về dict: {"total_sessions", "report": [ ... ]}."""
    now = datetime.now()

    sched_query = db.query(ClassSchedule).filter(ClassSchedule.class_id == ma_lop_tc.strip())
    if from_date:
        sched_query = sched_query.filter(ClassSchedule.study_date >= from_date)
    if to_date:
        sched_query = sched_query.filter(ClassSchedule.study_date <= to_date)
    schedules = sched_query.all()
    schedule_ids = [s.schedule_id for s in schedules]
    total_sessions = len(schedule_ids)

    enrollments = db.query(StudentClassEnrollment).filter(
        StudentClassEnrollment.class_id == ma_lop_tc.strip()
    ).all()

    report = []
    if not enrollments:
        return {"total_sessions": total_sessions, "report": report}

    student_ids = [e.student_id for e in enrollments]

    # Truy vấn gộp toàn bộ attendance của các SV này trong các buổi của lớp
    att_records = []
    if total_sessions > 0:
        att_records = db.query(AttendanceHistory).filter(
            AttendanceHistory.student_id.in_(student_ids),
            AttendanceHistory.schedule_id.in_(schedule_ids)
        ).all()

    # Gộp toàn bộ đơn nghỉ phép của các SV này (các buổi của lớp)
    leave_records = []
    if total_sessions > 0:
        leave_records = db.query(LeaveRequest).filter(
            LeaveRequest.student_id.in_(student_ids),
            LeaveRequest.schedule_id.in_(schedule_ids)
        ).all()

    # Chuẩn bị map lookup
    att_map = {}   # (student_id, schedule_id) -> status
    for r in att_records:
        att_map[(r.student_id, r.schedule_id)] = r.status

    pending_leave = set()  # (student_id, schedule_id) đơn đang chờ duyệt
    for lr in leave_records:
        if lr.status == "Pending":
            pending_leave.add((lr.student_id, lr.schedule_id))

    for e in enrollments:
        student = e.student
        if not student:
            continue

        co_mat = di_muon = co_phep = vang_kp = pending_cnt = 0
        attended = 0
        for s in schedules:
            key = (student.student_id, s.schedule_id)
            status = att_map.get(key)
            if status:
                attended += 1
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
                if key in pending_leave:
                    pending_cnt += 1
                elif _parse_datetime(s) < now:
                    vang_kp += 1

        # Điểm chuyên cần: bắt đầu 10.0, trừ 0.5 đi muộn, trừ 1.0 vắng không phép
        score = round(max(0.0, 10.0 - (di_muon * 0.5) - (vang_kp * 1.0)), 1)

        # Tỷ lệ vắng: (vắng không phép + vắng có phép) / tổng buổi
        total_absent = vang_kp + co_phep
        ty_le_vang = round((total_absent / total_sessions) * 100, 1) if total_sessions > 0 else 0.0

        trang_thai = "Cấm thi" if ty_le_vang > _cam_thi_threshold() else "Hợp lệ"

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
