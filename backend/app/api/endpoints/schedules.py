# File: app/api/endpoints/schedules.py
from fastapi import APIRouter, Depends, HTTPException, Form, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.models import ClassSession, Classroom, CreditClass, Semester

router = APIRouter()

class CheckConflictRequest(BaseModel):
    room_id: str = Field(..., description="Mã phòng học")
    lecturer_id: Optional[str] = Field(None, description="Mã giảng viên (Để kiểm tra lịch GV)")
    session_date: str = Field(..., description="Ngày học dự kiến (YYYY-MM-DD)")
    start_time: str = Field(..., description="Giờ bắt đầu (HH:MM:SS)")
    end_time: str = Field(..., description="Giờ kết thúc (HH:MM:SS)")

class AutoSuggestRequest(BaseModel):
    credit_class_id: str = Field(..., description="Mã lớp tín chỉ cần xếp lịch")
    session_date: str = Field(..., description="Ngày dự kiến xếp lịch (YYYY-MM-DD)")
    required_room_type: str = Field("Theory", description="Loại phòng yêu cầu")

@router.post("/schedules/check-conflict", summary="Check Schedule Conflict")
def check_schedule_conflict(req: CheckConflictRequest, db: Session = Depends(get_db)):
    """Kiểm tra xung đột lịch học (Check conflict)."""
    try:
        dt_date = datetime.strptime(req.session_date.strip(), "%Y-%m-%d").date()
        dt_start = datetime.strptime(req.start_time.strip(), "%H:%M:%S").time()
        dt_end = datetime.strptime(req.end_time.strip(), "%H:%M:%S").time()
        start_dt = datetime.combine(dt_date, dt_start)
        end_dt = datetime.combine(dt_date, dt_end)
    except ValueError: raise HTTPException(status_code=422, detail="Định dạng ngày/giờ không hợp lệ.")

    room_conflict = db.query(ClassSession).filter(
        ClassSession.room_id == req.room_id, ClassSession.session_date == dt_date,
        ClassSession.start_time < end_dt, ClassSession.end_time > start_dt
    ).first()

    if room_conflict:
        return {"is_conflict": True, "conflict_type": "ROOM", "message": f"Phòng {req.room_id} đã bị sử dụng."}

    if req.lecturer_id:
        lecturer_conflict = db.query(ClassSession).join(CreditClass).filter(
            CreditClass.lecturer_id == req.lecturer_id, ClassSession.session_date == dt_date,
            ClassSession.start_time < end_dt, ClassSession.end_time > start_dt
        ).first()
        if lecturer_conflict:
            return {"is_conflict": True, "conflict_type": "LECTURER", "message": f"Giảng viên bị kẹt lịch."}

    return {"is_conflict": False, "message": "Lịch học khả dụng."}

@router.post("/schedules/auto-suggest", summary="Auto Suggest Schedule")
def auto_suggest_schedule(req: AutoSuggestRequest, db: Session = Depends(get_db)):
    """Tự động đề xuất lịch học, tìm kiếm các phòng học trống."""
    cc = db.query(CreditClass).filter(CreditClass.class_id == req.credit_class_id).first()
    if not cc: raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ.")
    try: dt_date = datetime.strptime(req.session_date.strip(), "%Y-%m-%d").date()
    except ValueError: raise HTTPException(status_code=422, detail="Định dạng ngày không hợp lệ.")

    suggestions = []
    test_shifts = [
        {"shift": 1, "start": "07:00:00", "end": "10:00:00", "label": "Ca Sáng"},
        {"shift": 2, "start": "13:00:00", "end": "16:00:00", "label": "Ca Chiều"}
    ]

    for ts in test_shifts:
        start_time = datetime.strptime(ts["start"], "%H:%M:%S").time()
        end_time = datetime.strptime(ts["end"], "%H:%M:%S").time()
        start_dt = datetime.combine(dt_date, start_time)
        end_dt = datetime.combine(dt_date, end_time)

        busy_rooms = db.query(ClassSession.room_id).filter(
            ClassSession.session_date == dt_date, ClassSession.start_time < end_dt, ClassSession.end_time > start_dt
        ).all()
        busy_room_ids = [r[0] for r in busy_rooms]

        lecturer_busy = False
        if cc.lecturer_id:
            lecturer_conflict = db.query(ClassSession).join(CreditClass).filter(
                CreditClass.lecturer_id == cc.lecturer_id, ClassSession.session_date == dt_date,
                ClassSession.start_time < end_dt, ClassSession.end_time > start_dt
            ).first()
            if lecturer_conflict: lecturer_busy = True

        if lecturer_busy: continue 
        room = db.query(Classroom).filter(~Classroom.room_id.in_(busy_room_ids)).first()
        if room:
            suggestions.append({
                "room_id": room.room_id, "session_date": req.session_date,
                "shift": ts["shift"], "start_time": ts["start"], "end_time": ts["end"],
                "note": f"Đề xuất {ts['label']} - Phòng trống, GV rảnh"
            })
    if not suggestions: return {"status": "failed", "message": "Không tìm thấy đề xuất."}
    return {"status": "success", "data": suggestions}

@router.post("/schedules", summary="Add Schedule Session")
def add_schedule(
    class_id: str = Form(..., alias="ma_lop_tc"), session_date: str = Form(..., alias="ngay_hoc"), 
    room_id: str = Form(..., alias="phong_hoc"), start_time: str = Form(..., alias="gio_bat_dau"),
    shift: int = Form(1, alias="ca_hoc"), db: Session = Depends(get_db)
):
    """Thêm một buổi học thủ công vào danh sách lịch học của lớp."""
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
    if not cc:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp tín chỉ {class_id}")
    semester = db.query(Semester).filter(Semester.semester_id == cc.semester_id).first()
    if not semester:
        raise HTTPException(status_code=400, detail=f"Không tìm thấy học kỳ cho lớp {class_id}.")
    room = db.query(Classroom).filter(Classroom.room_id == room_id.strip()).first()
    if not room:
        raise HTTPException(status_code=400, detail=f"Không tìm thấy phòng học {room_id}.")
    try:
        dt_date = datetime.strptime(session_date.strip(), "%Y-%m-%d").date()
        if dt_date < semester.start_date or dt_date > semester.end_date:
            raise HTTPException(
                status_code=400,
                detail=f"Ngày học {session_date.strip()} phải nằm trong học kỳ {semester.semester_id} ({semester.start_date} → {semester.end_date})."
            )
        time_str = start_time.strip() if len(start_time.strip()) == 8 else start_time.strip() + ":00"
        dt_time = datetime.strptime(time_str, "%H:%M:%S").time()
        dt_start = datetime.combine(dt_date, dt_time)
        dt_end = dt_start + timedelta(hours=3)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Định dạng không hợp lệ.")

    room_conflicts = db.query(ClassSession).filter(ClassSession.room_id == room_id.strip()).all()
    for c in room_conflicts:
        if dt_start < c.end_time and dt_end > c.start_time:
            raise HTTPException(status_code=400, detail=f"Trùng lịch: Phòng {room_id} đã bận.")

    sched = ClassSession(
        class_id=class_id.strip(), room_id=room_id.strip(), session_date=dt_date,
        shift=shift, start_time=dt_start, end_time=dt_end
    )
    db.add(sched)
    db.commit()
    return {"status": "success", "message": f"Đã thêm lịch học cho lớp {class_id} tại phòng {room_id}"}

@router.get("/schedules", summary="List Schedules")
def list_schedules(lecturer_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Lấy danh sách tất cả các lịch học (Sessions)."""
    try:
        query = db.query(ClassSession)
        if lecturer_id: query = query.join(CreditClass).filter(CreditClass.lecturer_id == lecturer_id.strip())
        schedules = query.all()
        return {
            "status": "success",
            "schedules": [{
                "session_id": s.session_id, "class_id": s.class_id, "session_date": str(s.session_date),
                "room_id": s.room_id, "start_time": str(s.start_time.strftime("%H:%M") if hasattr(s.start_time, 'strftime') else s.start_time),
                "end_time": str(s.end_time), "shift": getattr(s, 'shift', 1), "loai_lich": getattr(s, 'loai_lich', 'Lý thuyết'), 
                "subject_name": s.credit_class.subject.subject_name if (s.credit_class and s.credit_class.subject) else "N/A"
            } for s in schedules]
        }
    except Exception as e: raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")# --- BATCH SCHEDULING ---
import math
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime, time, timedelta

class ClassScheduleRequest(BaseModel):
    credit_class_id: str
    lecturer_id: str
    theory_periods: int
    practice_periods: int
    max_students: int
    subject_name: Optional[str] = ""

class BatchAutoSuggestRequest(BaseModel):
    semester_id: str = Field(..., description="Mã học kỳ")
    classes: List[ClassScheduleRequest]
    avoid_evening_shift: bool = True
    allow_block_scheduling: bool = False

@router.post("/schedules/auto-suggest-batch", summary="Thuật toán xếp lịch tự động Hàng Loạt")
def batch_auto_suggest_schedule(req: BatchAutoSuggestRequest, db: Session = Depends(get_db)):
    semester = db.query(Semester).filter(Semester.semester_id == req.semester_id.strip()).first()
    if not semester:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy học kỳ {req.semester_id}")
    semester_start = semester.start_date

    shifts = [
        {"shift": 1, "start": time(7, 0), "end": time(11, 0), "label": "Ca Sáng", "periods": 4},
        {"shift": 7, "start": time(13, 0), "end": time(17, 0), "label": "Ca Chiều", "periods": 4}
    ]
    if not req.avoid_evening_shift:
        shifts.append({"shift": 12, "start": time(18, 0), "end": time(22, 0), "label": "Ca Tối", "periods": 4})

    sorted_classes = sorted(req.classes, key=lambda c: (c.theory_periods + c.practice_periods), reverse=True)
    all_rooms = db.query(Classroom).all()
    
    temp_room_busy = set()
    temp_lect_busy = set()

    def is_slot_free(check_date, shift_info, room_id, lecturer_id):
        if (room_id, check_date, shift_info["shift"]) in temp_room_busy: return False, "Phòng kẹt (Lớp xếp trước)"
        if lecturer_id and (lecturer_id, check_date, shift_info["shift"]) in temp_lect_busy: return False, "GV kẹt (Lớp xếp trước)"
            
        if lecturer_id:
            lect_conflict = db.query(ClassSession).join(CreditClass).filter(
                CreditClass.lecturer_id == lecturer_id, ClassSession.session_date == check_date,
                ClassSession.start_time < datetime.combine(check_date, shift_info["end"]),
                ClassSession.end_time > datetime.combine(check_date, shift_info["start"])
            ).first()
            if lect_conflict: return False, "GV trùng lịch DB"
        
        room_conflict = db.query(ClassSession).filter(
            ClassSession.room_id == room_id, ClassSession.session_date == check_date,
            ClassSession.start_time < datetime.combine(check_date, shift_info["end"]),
            ClassSession.end_time > datetime.combine(check_date, shift_info["start"])
        ).first()
        if room_conflict: return False, "Phòng trùng DB"
            
        return True, ""

    def is_room_match(r, req_type):
        rt = str(getattr(r, 'room_type', getattr(r, 'type', ''))).lower()
        if req_type == "Theory":
            return any(k in rt for k in ["theory", "lý thuyết", "lt", "phòng"]) or not rt
        return any(k in rt for k in ["practice", "thực hành", "th", "lab", "máy"])

    results = []
    
    for cls in sorted_classes:
        db_cls = db.query(CreditClass).filter_by(class_id=cls.credit_class_id).first()
        t_periods = 0
        p_periods = 0
        if db_cls and db_cls.subject:
            if not db_cls.parent_class_id:
                t_periods = db_cls.subject.theory_periods or 0
                p_periods = 0
            else:
                t_periods = 0
                p_periods = db_cls.subject.practical_periods or 0
        else:
            t_periods = cls.theory_periods
            p_periods = cls.practice_periods
        
        theory_sessions = math.ceil(t_periods / 4.0)
        practice_sessions = math.ceil(p_periods / 4.0)
        
        cls_suggestions = []
        err_logs = []

        def find_pattern(start_date, sessions_needed, req_type, sessions_per_week=1, exclude_wd=[]):
            valid_rooms = [r for r in all_rooms if is_room_match(r, req_type) and (r.capacity or 0) >= cls.max_students]
            valid_rooms.sort(key=lambda x: x.capacity or 0)
            if not valid_rooms: return None, f"Không có phòng {req_type} >= {cls.max_students} chỗ."

            weeks_needed = math.ceil(sessions_needed / sessions_per_week)
            
            for room in valid_rooms:
                free_slots = []
                for day_offset in range(7):
                    first_date = start_date + timedelta(days=day_offset)
                    if first_date.weekday() == 6 or first_date.weekday() in exclude_wd: continue
                    
                    for shift in shifts:
                        can_schedule = True
                        for w in range(weeks_needed):
                            check_date = first_date + timedelta(weeks=w)
                            ok, _ = is_slot_free(check_date, shift, room.room_id, cls.lecturer_id)
                            if not ok:
                                can_schedule = False
                                break
                        if can_schedule:
                            free_slots.append({"room": room, "first_date": first_date, "shift": shift, "weekday": first_date.weekday()})
                
                if len(free_slots) >= sessions_per_week:
                    if sessions_per_week == 1: return [free_slots[0]], ""
                    s1 = free_slots[0]
                    s2 = next((s for s in free_slots[1:] if abs(s["weekday"] - s1["weekday"]) >= 2), free_slots[1])
                    return [s1, s2], ""
            return None, "Không tìm được khe thời gian rảnh liên tục."

        if theory_sessions > 0:
            pat, err = find_pattern(semester_start, theory_sessions, "Theory", 1)
            if not pat and req.allow_block_scheduling: 
                pat, err = find_pattern(semester_start, theory_sessions, "Theory", 2)
            if pat:
                added = 0
                for w in range(math.ceil(theory_sessions / len(pat))):
                    for p in pat:
                        if added >= theory_sessions: break
                        s_date = p["first_date"] + timedelta(weeks=w)
                        cls_suggestions.append({
                            "room_id": p["room"].room_id, "session_date": str(s_date),
                            "shift": p["shift"]["shift"], "start_time": p["shift"]["start"].strftime("%H:%M:%S"),
                            "end_time": p["shift"]["end"].strftime("%H:%M:%S"), "weekday": s_date.weekday(), "room_type": "Theory"
                        })
                        temp_room_busy.add((p["room"].room_id, s_date, p["shift"]["shift"]))
                        if cls.lecturer_id: temp_lect_busy.add((cls.lecturer_id, s_date, p["shift"]["shift"]))
                        added += 1
            else:
                err_logs.append(f"Lý thuyết: {err}")

        if practice_sessions > 0:
            pat, err = find_pattern(semester_start, practice_sessions, "Practice", 1)
            if pat:
                added = 0
                for w in range(math.ceil(practice_sessions / len(pat))):
                    for p in pat:
                        if added >= practice_sessions: break
                        s_date = p["first_date"] + timedelta(weeks=w)
                        cls_suggestions.append({
                            "room_id": p["room"].room_id, "session_date": str(s_date),
                            "shift": p["shift"]["shift"], "start_time": p["shift"]["start"].strftime("%H:%M:%S"),
                            "end_time": p["shift"]["end"].strftime("%H:%M:%S"), "weekday": s_date.weekday(), "room_type": "Practice"
                        })
                        temp_room_busy.add((p["room"].room_id, s_date, p["shift"]["shift"]))
                        if cls.lecturer_id: temp_lect_busy.add((cls.lecturer_id, s_date, p["shift"]["shift"]))
                        added += 1
            else:
                err_logs.append(f"Thực hành: {err}")

        results.append({
            "class_id": cls.credit_class_id, "subject_name": cls.subject_name,
            "lecturer_id": cls.lecturer_id, "schedules": cls_suggestions, "errors": err_logs
        })

    return {"status": "success", "data": results}

class ScheduleSessionInput(BaseModel):
    class_id: str
    room_id: str
    session_date: str
    shift: int
    start_time: str
    end_time: str
    room_type: str = "Theory"

class BatchSaveRequest(BaseModel):
    classes: List[str]
    schedules: List[ScheduleSessionInput]

@router.post("/schedules/batch-save", summary="Lưu hàng loạt lịch học")
def batch_save_schedules(req: BatchSaveRequest, db: Session = Depends(get_db)):
    try:
        from app.models.class_schedule import ClassSchedule
        db.query(ClassSession).filter(ClassSession.class_id.in_(req.classes)).delete(synchronize_session=False)
        db.query(ClassSchedule).filter(ClassSchedule.class_id.in_(req.classes)).delete(synchronize_session=False)
        
        new_sessions = []
        pattern_set = set()
        
        for s in req.schedules:
            dt_date = datetime.strptime(s.session_date, "%Y-%m-%d").date()
            dt_start = datetime.strptime(s.start_time, "%H:%M:%S").time()
            dt_end = datetime.strptime(s.end_time, "%H:%M:%S").time()
            day_of_week = dt_date.weekday() + 2
            
            pattern_set.add((s.class_id, day_of_week, s.shift, s.room_id))
            
            new_sessions.append(
                ClassSession(
                    class_id=s.class_id,
                    room_id=s.room_id,
                    session_date=dt_date,
                    shift=s.shift,
                    start_time=datetime.combine(dt_date, dt_start),
                    end_time=datetime.combine(dt_date, dt_end),
                    session_type=s.room_type,
                    status='Scheduled'
                )
            )
            
        new_schedules = []
        for class_id, day_of_week, shift, room_id in pattern_set:
            new_schedules.append(
                ClassSchedule(class_id=class_id, room_id=room_id, day_of_week=day_of_week, start_shift=shift, end_shift=shift+3) 
            )
        
        if new_sessions: db.bulk_save_objects(new_sessions)
        if new_schedules: db.bulk_save_objects(new_schedules)
            
        db.commit()
        return {"status": "success", "message": f"Đã lưu thành công lịch cho {len(req.classes)} lớp."}
    except Exception as e:
        import traceback
        with open('debug_error.log', 'w', encoding='utf-8') as f:
            f.write(traceback.format_exc())
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

class ResetSchedulesRequest(BaseModel):
    semester_id: str = Field(..., description="Mã học kỳ cần reset lịch")

@router.post("/schedules/reset", summary="Reset toàn bộ lịch học của học kỳ")
def reset_semester_schedules(req: ResetSchedulesRequest, db: Session = Depends(get_db)):
    """Xóa toàn bộ lịch học (sessions và schedules) của các lớp trong một học kỳ cụ thể."""
    try:
        from app.models.class_schedule import ClassSchedule
        
        classes_in_semester = db.query(CreditClass.class_id).filter(CreditClass.semester_id == req.semester_id).all()
        class_ids = [c[0] for c in classes_in_semester]
        
        if not class_ids:
            return {"status": "success", "message": "Không có lớp nào trong học kỳ này để reset."}
            
        deleted_sessions = db.query(ClassSession).filter(ClassSession.class_id.in_(class_ids)).delete(synchronize_session=False)
        deleted_schedules = db.query(ClassSchedule).filter(ClassSchedule.class_id.in_(class_ids)).delete(synchronize_session=False)
        
        db.commit()
        return {
            "status": "success", 
            "message": f"Đã reset thành công! Xóa {deleted_sessions} buổi học và {deleted_schedules} cấu hình lịch tuần."
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống khi reset: {e}")



