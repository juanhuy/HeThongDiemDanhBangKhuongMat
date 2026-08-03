import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models import Classroom
from app.schemas.classroom import ClassroomCreate, ClassroomUpdate

def get_classroom(db: Session, room_id: str):
    return db.query(Classroom).filter(Classroom.room_id == room_id).first()

def get_classrooms(db: Session, skip: int = 0, limit: int = 100, search: str = None, status: str = None):
    query = db.query(Classroom)
    if search:
        query = query.filter(or_(
            Classroom.room_name.ilike(f"%{search}%"),
            Classroom.building.ilike(f"%{search}%")
        ))
    if status:
        query = query.filter(Classroom.status == status)
    
    rooms = query.offset(skip).limit(limit).all()
    
    now = datetime.now()
    current_day = now.weekday() + 2 # Monday is 2, Sunday is 8
    hour = now.hour
    current_shift = (hour - 7) + 1 if 7 <= hour < 19 else 0
    
    for r in rooms:
        scheduled_classes = list(set([s.class_id for s in r.schedules]))
        is_occupied = False
        if current_shift > 0:
            for s in r.schedules:
                if s.day_of_week == current_day and s.start_shift <= current_shift <= s.end_shift:
                    is_occupied = True
                    break
        setattr(r, 'scheduled_classes', scheduled_classes)
        setattr(r, 'is_occupied', is_occupied)
        
    return rooms

def create_classroom(db: Session, classroom: ClassroomCreate):
    data = classroom.model_dump()
    if not data.get("room_id"):
        random_suffix = str(uuid.uuid4()).split("-")[0][:6].upper()
        data["room_id"] = f"RM-{random_suffix}"
    
    db_room = Classroom(**data)
    db.add(db_room)
    db.commit()
    db.refresh(db_room)
    return db_room

def update_classroom(db: Session, room_id: str, classroom_update: ClassroomUpdate):
    db_room = get_classroom(db, room_id)
    if not db_room:
        return None
    
    update_data = classroom_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_room, key, value)
        
    db.commit()
    db.refresh(db_room)
    return db_room

def delete_classroom(db: Session, room_id: str):
    db_room = get_classroom(db, room_id)
    if db_room:
        db.delete(db_room)
        db.commit()
    return db_room