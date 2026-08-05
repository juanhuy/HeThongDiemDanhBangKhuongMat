from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from datetime import datetime, timedelta, date

from app.db.session import get_db
from app.models import (
    CreditClass, ClassEnrollment, ClassSession, ClassSchedule,
    Student, Lecturer, Subject, Classroom, ExpectedClassMapping
)

router = APIRouter()

DAY_NAMES = {2: "Thứ 2", 3: "Thứ 3", 4: "Thứ 4", 5: "Thứ 5", 6: "Thứ 6", 7: "Thứ 7", 8: "Chủ Nhật"}


def _monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())  # Monday=0


def _format_class_group(c: CreditClass) -> str:
    if c.sub_group_number is not None:
        return f"{c.sub_group_number:02d}"
    if c.group_number is not None:
        return f"{c.group_number:02d}"
    return ""


def _class_info(c: CreditClass) -> dict:
    subj = c.subject
    credits = 0
    if subj:
        credits = subj.credits or ((subj.theory_credits or 0) + (subj.practical_credits or 0))
    target = [m.admin_class_id for m in (c.expected_mappings or [])]
    return {
        "class_id": c.class_id,
        "parent_class_id": c.parent_class_id,
        "subject_id": c.subject_id,
        "subject_name": subj.subject_name if subj else None,
        "lecturer_id": c.lecturer_id,
        "lecturer_name": c.lecturer.full_name if c.lecturer else None,
        "semester_id": c.semester_id,
        "class_group": _format_class_group(c),
        "class_type": c.class_type,
        "max_students": c.max_students,
        "current_students": c.current_students,
        "credits": credits,
        "target_classes": target,
        "status": c.status,
    }


def _expand_schedule_to_week(sched: ClassSchedule, week_monday: date) -> Optional[dict]:
    """ClassSchedule (day_of_week 2-8, start_shift) → 1 ô trong tuần cụ thể."""
    # day_of_week: 2=Mon ... 7=Sat, 8=Sun (theo convention PTIT)
    dow = sched.day_of_week
    if dow is None:
        return None
    if dow == 8:
        offset = 6  # Sunday
    else:
        offset = dow - 2  # Mon=0
    if offset < 0 or offset > 6:
        return None
    session_date = week_monday + timedelta(days=offset)
    # Ước lượng giờ từ tiết (tiết 1 ≈ 07:00, mỗi tiết 60p)
    start_h = 6 + (sched.start_shift or 1)
    end_h = 6 + (sched.end_shift or sched.start_shift or 1) + 1
    start_dt = datetime.combine(session_date, datetime.min.time()).replace(hour=min(start_h, 22), minute=0)
    end_dt = datetime.combine(session_date, datetime.min.time()).replace(hour=min(end_h, 23), minute=0)
    return {
        "schedule_id": sched.schedule_id,
        "class_id": sched.class_id,
        "room_id": sched.room_id,
        "session_date": str(session_date),
        "day_of_week": dow,
        "start_shift": sched.start_shift,
        "end_shift": sched.end_shift,
        "so_tiet": max(1, (sched.end_shift or sched.start_shift or 1) - (sched.start_shift or 1) + 1),
        "start_time": start_dt.isoformat(),
        "end_time": end_dt.isoformat(),
        "source": "schedule",  # template tuần
    }


def _session_to_slot(s: ClassSession) -> dict:
    return {
        "session_id": s.session_id,
        "class_id": s.class_id,
        "room_id": s.room_id,
        "session_date": str(s.session_date) if s.session_date else None,
        "day_of_week": (s.session_date.weekday() + 2) if s.session_date else None,  # Mon→2
        "start_shift": s.shift,
        "end_shift": s.shift,
        "so_tiet": 1,
        "start_time": s.start_time.isoformat() if s.start_time else None,
        "end_time": s.end_time.isoformat() if s.end_time else None,
        "source": "session",
    }


def _build_slots_for_classes(
    db: Session,
    class_ids: List[str],
    mode: str,
    week_start: Optional[date],
) -> list:
    if not class_ids:
        return []

    classes = (
        db.query(CreditClass)
        .options(
            joinedload(CreditClass.subject),
            joinedload(CreditClass.lecturer),
            joinedload(CreditClass.expected_mappings),
        )
        .filter(CreditClass.class_id.in_(class_ids))
        .all()
    )
    class_map = {c.class_id: _class_info(c) for c in classes}

    slots = []

    if mode == "week":
        monday = _monday_of(week_start or date.today())
        sunday = monday + timedelta(days=6)

        # 1) Buổi học thực tế trong tuần
        sessions = (
            db.query(ClassSession)
            .filter(
                ClassSession.class_id.in_(class_ids),
                ClassSession.session_date >= monday,
                ClassSession.session_date <= sunday,
            )
            .all()
        )
        for s in sessions:
            slot = _session_to_slot(s)
            slot["class_info"] = class_map.get(s.class_id, {})
            slot["subject_name"] = class_map.get(s.class_id, {}).get("subject_name")
            slots.append(slot)

        # 2) Template ClassSchedule → expand ra tuần (nếu chưa có session trùng)
        existing_keys = {(x["class_id"], x["session_date"], x.get("start_shift")) for x in slots}
        schedules = (
            db.query(ClassSchedule)
            .filter(ClassSchedule.class_id.in_(class_ids))
            .all()
        )
        for sch in schedules:
            expanded = _expand_schedule_to_week(sch, monday)
            if not expanded:
                continue
            key = (expanded["class_id"], expanded["session_date"], expanded["start_shift"])
            if key in existing_keys:
                continue
            expanded["class_info"] = class_map.get(sch.class_id, {})
            expanded["subject_name"] = class_map.get(sch.class_id, {}).get("subject_name")
            slots.append(expanded)

    else:
        # mode == semester: trả về template ClassSchedule (không expand ngày)
        schedules = (
            db.query(ClassSchedule)
            .filter(ClassSchedule.class_id.in_(class_ids))
            .all()
        )
        for sch in schedules:
            info = class_map.get(sch.class_id, {})
            slots.append({
                "schedule_id": sch.schedule_id,
                "class_id": sch.class_id,
                "room_id": sch.room_id,
                "day_of_week": sch.day_of_week,
                "start_shift": sch.start_shift,
                "end_shift": sch.end_shift,
                "so_tiet": max(1, (sch.end_shift or sch.start_shift or 1) - (sch.start_shift or 1) + 1),
                "source": "schedule",
                "class_info": info,
                "subject_name": info.get("subject_name"),
                "subject_id": info.get("subject_id"),
                "class_group": info.get("class_group"),
                "credits": info.get("credits"),
                "target_classes": info.get("target_classes", []),
                "lecturer_name": info.get("lecturer_name"),
                "max_students": info.get("max_students"),
                "current_students": info.get("current_students"),
            })

        # Nếu không có ClassSchedule, fallback từ ClassSession (gom unique theo thứ+tiết+phòng)
        if not slots:
            sessions = db.query(ClassSession).filter(ClassSession.class_id.in_(class_ids)).all()
            seen = set()
            for s in sessions:
                dow = (s.session_date.weekday() + 2) if s.session_date else None
                key = (s.class_id, dow, s.shift, s.room_id)
                if key in seen:
                    continue
                seen.add(key)
                info = class_map.get(s.class_id, {})
                slots.append({
                    "session_id": s.session_id,
                    "class_id": s.class_id,
                    "room_id": s.room_id,
                    "day_of_week": dow,
                    "start_shift": s.shift,
                    "end_shift": s.shift,
                    "so_tiet": 1,
                    "source": "session",
                    "class_info": info,
                    "subject_name": info.get("subject_name"),
                    "subject_id": info.get("subject_id"),
                    "class_group": info.get("class_group"),
                    "credits": info.get("credits"),
                    "target_classes": info.get("target_classes", []),
                    "lecturer_name": info.get("lecturer_name"),
                    "max_students": info.get("max_students"),
                    "current_students": info.get("current_students"),
                })

    return slots


# =========================================================================
# SINH VIÊN
# =========================================================================
@router.get("/timetable/student/{student_id}")
def student_timetable(
    student_id: str,
    mode: str = Query("week", regex="^(week|semester)$"),
    week_start: Optional[str] = Query(None, description="YYYY-MM-DD (bất kỳ ngày trong tuần)"),
    db: Session = Depends(get_db),
):
    sid = student_id.strip().upper()
    enrollments = (
        db.query(ClassEnrollment)
        .filter(ClassEnrollment.student_id == sid)
        .all()
    )
    class_ids = [e.class_id for e in enrollments]
    ws = None
    if week_start:
        try:
            ws = datetime.strptime(week_start, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "week_start phải dạng YYYY-MM-DD")

    slots = _build_slots_for_classes(db, class_ids, mode, ws)
    return {
        "status": "success",
        "mode": mode,
        "student_id": sid,
        "week_start": str(_monday_of(ws or date.today())) if mode == "week" else None,
        "total": len(slots),
        "slots": slots,
    }


# =========================================================================
# GIẢNG VIÊN
# =========================================================================
@router.get("/timetable/lecturer/{lecturer_id}")
def lecturer_timetable(
    lecturer_id: str,
    mode: str = Query("week", regex="^(week|semester)$"),
    week_start: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    lid = lecturer_id.strip()
    classes = db.query(CreditClass).filter(CreditClass.lecturer_id == lid).all()
    class_ids = [c.class_id for c in classes]
    ws = None
    if week_start:
        try:
            ws = datetime.strptime(week_start, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "week_start phải dạng YYYY-MM-DD")

    slots = _build_slots_for_classes(db, class_ids, mode, ws)
    return {
        "status": "success",
        "mode": mode,
        "lecturer_id": lid,
        "week_start": str(_monday_of(ws or date.today())) if mode == "week" else None,
        "total": len(slots),
        "slots": slots,
        "teaching_classes": [_class_info(c) for c in classes],
    }


# =========================================================================
# ADMIN – TỔNG QUÁT
# =========================================================================
@router.get("/timetable/admin")
def admin_timetable(
    mode: str = Query("week", regex="^(week|semester)$"),
    week_start: Optional[str] = Query(None),
    semester_id: Optional[str] = None,
    lecturer_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    room_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(CreditClass)
    if semester_id:
        q = q.filter(CreditClass.semester_id == semester_id.strip())
    if lecturer_id:
        q = q.filter(CreditClass.lecturer_id == lecturer_id.strip())
    if subject_id:
        q = q.filter(CreditClass.subject_id == subject_id.strip())
    classes = q.all()
    class_ids = [c.class_id for c in classes]

    ws = None
    if week_start:
        try:
            ws = datetime.strptime(week_start, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(400, "week_start phải dạng YYYY-MM-DD")

    slots = _build_slots_for_classes(db, class_ids, mode, ws)
    if room_id:
        slots = [s for s in slots if (s.get("room_id") or "") == room_id.strip()]

    return {
        "status": "success",
        "mode": mode,
        "week_start": str(_monday_of(ws or date.today())) if mode == "week" else None,
        "filters": {
            "semester_id": semester_id,
            "lecturer_id": lecturer_id,
            "subject_id": subject_id,
            "room_id": room_id,
        },
        "total": len(slots),
        "slots": slots,
    }


# =========================================================================
# DANH SÁCH SV TRONG LỚP (alias tiện dùng từ TKB)
# =========================================================================
@router.get("/timetable/classes/{class_id}/students")
def timetable_class_students(class_id: str, db: Session = Depends(get_db)):
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
    if not cc:
        raise HTTPException(404, "Không tìm thấy lớp tín chỉ")
    enrollments = (
        db.query(ClassEnrollment)
        .options(joinedload(ClassEnrollment.student).joinedload(Student.profile))
        .filter(ClassEnrollment.class_id == class_id.strip())
        .all()
    )
    data = []
    for e in enrollments:
        st = e.student
        if not st:
            continue
        data.append({
            "student_id": st.student_id,
            "full_name": st.profile.full_name if st.profile else "N/A",
            "administrative_class": st.administrative_class,
            "enrollment_date": (e.updated_at or e.enrollment_date).isoformat()
            if (e.updated_at or e.enrollment_date) else None,
            "status": e.status,
        })
    return {
        "status": "success",
        "class_id": class_id,
        "total_students": len(data),
        "data": data,
    }