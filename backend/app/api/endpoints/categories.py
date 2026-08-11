# File: app/api/endpoints/categories.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional

from app.db.session import get_db
from app.models import Classroom, ClassSession, AdministrativeClass, Semester

# Bổ sung import Major tùy thuộc vào đường dẫn dự án
# from app.models.major import Major 

router = APIRouter()

@router.get("/classrooms", summary="Get Classrooms List")
def list_classrooms(
    skip: int = Query(0), limit: int = Query(100), campus: Optional[str] = Query(None), db: Session = Depends(get_db)
):
    """Lấy danh sách tất cả phòng học."""
    query = db.query(Classroom)
    if campus: pass # Cấu hình query filter theo campus ở đây
    rooms = query.offset(skip).limit(limit).all()
    return {"status": "success", "total": len(rooms), "data": [{"room_id": r.room_id} for r in rooms]}

@router.get("/classrooms/available", summary="Get Available Classrooms")
def get_available_classrooms(
    session_date: str = Query(...), start_time: str = Query(...), end_time: str = Query(...),
    min_capacity: Optional[int] = Query(None), db: Session = Depends(get_db)
):
    """Tìm kiếm các phòng học trống trong một khung giờ cụ thể."""
    try:
        dt_date = datetime.strptime(session_date.strip(), "%Y-%m-%d").date()
        dt_start = datetime.strptime(start_time.strip(), "%H:%M:%S").time()
        dt_end = datetime.strptime(end_time.strip(), "%H:%M:%S").time()
        start_datetime = datetime.combine(dt_date, dt_start)
        end_datetime = datetime.combine(dt_date, dt_end)
    except ValueError: raise HTTPException(status_code=422, detail="Lỗi định dạng")
    busy_sessions = db.query(ClassSession.room_id).filter(
        ClassSession.session_date == dt_date, ClassSession.start_time < end_datetime, ClassSession.end_time > start_datetime
    ).all()
    busy_room_ids = [s[0] for s in busy_sessions]
    query = db.query(Classroom).filter(~Classroom.room_id.in_(busy_room_ids))
    available_rooms = query.all()
    return {"status": "success", "data": [{"room_id": r.room_id} for r in available_rooms]}

@router.get("/majors-list", summary="Get Majors List")
def get_majors_list(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả các Ngành học."""
    from app.models.major import Major # Khai báo class Major
    majors = db.query(Major).all()
    return {"status": "success", "data": [{"major_id": m.major_id, "major_name": m.major_name} for m in majors]}

@router.get("/administrative-classes", summary="Get All Admin Classes")
def get_all_admin_classes(db: Session = Depends(get_db)):
    """Lấy danh sách toàn bộ Lớp hành chính."""
    classes = db.query(AdministrativeClass).all()
    return {"status": "success", "data": [{"class_id": c.class_id, "class_name": c.class_name} for c in classes]}

@router.get("/semesters", summary="Get Semesters")
def get_semesters(db: Session = Depends(get_db)):
    """Lấy danh sách các Học kỳ."""
    semesters = db.query(Semester).order_by(Semester.start_date.desc()).all()
    return {
        "status": "success",
        "data": [
            {
                "semester_id": s.semester_id,
                "semester": s.semester_number,
                "academic_year": s.academic_year,
                "start_date": s.start_date.isoformat() if getattr(s, "start_date", None) is not None else None,
                "end_date": s.end_date.isoformat() if getattr(s, "end_date", None) is not None else None,
                "status": getattr(s, "status", None),
            }
            for s in semesters
        ],
    }