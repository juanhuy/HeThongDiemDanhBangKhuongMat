import uuid
from datetime import datetime
from sqlalchemy.orm import Session, selectinload # Thêm selectinload
from sqlalchemy import or_
from app.models import Classroom
from app.schemas.classroom import ClassroomCreate, ClassroomUpdate

# =======================================================
# BỔ SUNG: Hàm tự động sinh mã phòng học (VD: PH2024001)
# =======================================================
def generate_room_id(db: Session) -> str:
    current_year = datetime.now().year
    prefix = f"PH{current_year}"
    
    # Lấy danh sách ID hiện tại
    rows = db.query(Classroom.room_id).filter(Classroom.room_id.like(f"{prefix}%")).all()
    numbers = []
    for (room_id,) in rows:
        if not room_id or not room_id.startswith(prefix):
            continue
        try:
            numbers.append(int(room_id.replace(prefix, "")))
        except ValueError:
            continue
            
    sequence = max(numbers) + 1 if numbers else 1
    return f"{prefix}{sequence:03d}"

# =======================================================
# CRUD FUNCTIONS
# =======================================================

def get_classroom(db: Session, room_id: str):
    room = (
        db.query(Classroom)
        .options(selectinload(Classroom.schedules))
        .filter(Classroom.room_id == room_id)
        .first()
    )
    if room:
        room = _calculate_occupancy(room) # Fix Áp dụng tính toán cho phòng chi tiết
    return room

def get_classrooms(db: Session, skip: int = 0, limit: int = 100, search: str = None, status: str = None):
    query = db.query(Classroom).options(selectinload(Classroom.schedules))
    
    if search:
        query = query.filter(or_(
            Classroom.room_name.ilike(f"%{search}%"),
            Classroom.building.ilike(f"%{search}%")
        ))
    if status:
        query = query.filter(Classroom.status == status)
    
    rooms = query.offset(skip).limit(limit).all()
    
    # fix: Sử dụng hàm helper cho code gọn hơn
    for r in rooms:
        _calculate_occupancy(r)
        
    return rooms

def create_classroom(db: Session, obj_in: ClassroomCreate):
    # Ghép tên phòng = building + room_number (VD: A + 101 = A101)
    generated_room_name = f"{obj_in.building}{obj_in.room_number}" 
    
    new_room_id = obj_in.room_id or generate_room_id(db) 

    # Exclude room_name để tránh lỗi "multiple values for keyword argument"
    db_obj = Classroom(
        **obj_in.model_dump(exclude={"room_id", "room_name"}, exclude_unset=True), 
        room_id=new_room_id,
        room_name=generated_room_name
    )
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_classroom(db: Session, db_obj: Classroom, obj_in: ClassroomUpdate):
    update_data = obj_in.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        if field not in ["room_id", "room_name"]:  # Chặn người dùng tự update thẳng room_name và room_id
            setattr(db_obj, field, value)
        
    # NẾU có thay đổi Tòa nhà hoặc Số phòng -> Phải cập nhật lại room_name
    if "building" in update_data or "room_number" in update_data:
        # Nếu chỉ update 1 trong 2, thì phải lấy thuộc tính còn lại từ db_obj
        building = update_data.get("building", db_obj.building)
        room_number = update_data.get("room_number", db_obj.room_number)
        db_obj.room_name = f"{building}{room_number}"

    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_classroom(db: Session, room_id: str):
    db_room = get_classroom(db, room_id)
    if db_room:
        db.delete(db_room)
        db.commit()
    return db_room

def _calculate_occupancy(r: Classroom):
    """Hàm Helper: Tính toán lịch học và trạng thái phòng trống"""
    now = datetime.now()
    current_day = now.weekday() + 2
    hour = now.hour
    current_shift = (hour - 7) + 1 if 7 <= hour < 19 else 0
    
    scheduled_classes = list(set([s.class_id for s in getattr(r, 'schedules', [])]))
    is_occupied = False
    
    if current_shift > 0 and hasattr(r, 'schedules'):
        for s in r.schedules:
            if s.day_of_week == current_day and s.start_shift <= current_shift <= s.end_shift:
                is_occupied = True
                break
                
    setattr(r, 'scheduled_classes', scheduled_classes)
    setattr(r, 'is_occupied', is_occupied)
    return r