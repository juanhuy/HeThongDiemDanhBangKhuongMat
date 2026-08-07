# File: app/api/endpoints/schedules.py
from fastapi import APIRouter, Depends, HTTPException, Form, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.models import ClassSession, Classroom, CreditClass

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
    if not cc: raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp tín chỉ {class_id}")
    room = db.query(Classroom).filter(Classroom.room_id == room_id.strip()).first()
    if not room: raise HTTPException(status_code=400, detail=f"Không tìm thấy phòng học {room_id}.")
    try:
        dt_date = datetime.strptime(session_date.strip(), "%Y-%m-%d").date()
        time_str = start_time.strip() if len(start_time.strip()) == 8 else start_time.strip() + ":00"
        dt_time = datetime.strptime(time_str, "%H:%M:%S").time()
        dt_start = datetime.combine(dt_date, dt_time)
        dt_end = dt_start + timedelta(hours=3)
    except Exception as e: raise HTTPException(status_code=400, detail=f"Định dạng không hợp lệ.")

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
    except Exception as e: raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")