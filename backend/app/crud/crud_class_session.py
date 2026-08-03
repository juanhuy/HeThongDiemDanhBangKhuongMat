from sqlalchemy.orm import Session
from app.models import ClassSession
from app.schemas.class_session import ClassSessionCreate, ClassSessionUpdate
from datetime import date

def get_session(db: Session, session_id: int):
    return db.query(ClassSession).filter(ClassSession.session_id == session_id).first()

def get_sessions(db: Session, class_id: str = None, room_id: str = None, 
                 start_date: date = None, end_date: date = None):
    query = db.query(ClassSession)
    
    if class_id: query = query.filter(ClassSession.class_id == class_id)
    if room_id: query = query.filter(ClassSession.room_id == room_id)
    if start_date: query = query.filter(ClassSession.session_date >= start_date)
    if end_date: query = query.filter(ClassSession.session_date <= end_date)
        
    return query.order_by(ClassSession.session_date, ClassSession.shift).all()

def create_session(db: Session, session: ClassSessionCreate):
    db_session = ClassSession(**session.model_dump())
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def update_session(db: Session, session_id: int, session_update: ClassSessionUpdate):
    db_session = get_session(db, session_id)
    if not db_session:
        return None
        
    update_data = session_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_session, key, value)
        
    db.commit()
    db.refresh(db_session)
    return db_session