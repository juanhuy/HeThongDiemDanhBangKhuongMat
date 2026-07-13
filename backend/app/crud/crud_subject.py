from app import schemas
from sqlalchemy.orm import Session
from app.models.subject import Subject
from app.schemas.subject import SubjectCreate
from sqlalchemy import or_

def get_subjects(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Subject).offset(skip).limit(limit).all()

def get_subject_by_id(db: Session, subject_id: str):
    return db.query(Subject).filter(Subject.subject_id == subject_id).first()

def create_subject(db: Session, subject: SubjectCreate):
    db_subject = Subject(**subject.dict())
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject

def update_subject(db: Session, subject_id: str, subject_update: schemas.SubjectUpdate):
    db_obj = db.query(Subject).filter(Subject.subject_id == subject_id).first()
    if not db_obj:
        return None
    
    # Cập nhật các trường dữ liệu
    update_data = subject_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_obj, key, value)
        
    db.commit()
    db.refresh(db_obj)
    return db_obj

def search_subjects(db: Session, query: str):
    # Tìm kiếm với từ khóa query (không phân biệt hoa thường với ilike)
    search_pattern = f"%{query}%"
    return db.query(Subject).filter(
        or_(
            Subject.subject_id.ilike(search_pattern),
            Subject.subject_name.ilike(search_pattern)
        )
    ).all()