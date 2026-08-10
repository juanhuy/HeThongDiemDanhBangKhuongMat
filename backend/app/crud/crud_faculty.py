from sqlalchemy.orm import Session
from app.models.faculty import Faculty
from app.schemas.faculty import FacultyCreate, FacultyUpdate

def get_faculty(db: Session, faculty_id: str):
    return db.query(Faculty).filter(Faculty.faculty_id == faculty_id).first()

def get_faculties(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Faculty).offset(skip).limit(limit).all()

def create_faculty(db: Session, faculty: FacultyCreate):
    db_faculty = Faculty(**faculty.model_dump())
    db.add(db_faculty)
    db.commit()
    db.refresh(db_faculty)
    return db_faculty

def update_faculty(db: Session, db_faculty: Faculty, faculty_update: FacultyUpdate):
    update_data = faculty_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_faculty, key, value)
    db.add(db_faculty)
    db.commit()
    db.refresh(db_faculty)
    return db_faculty

def delete_faculty(db: Session, faculty_id: str):
    db_faculty = get_faculty(db, faculty_id)
    if db_faculty:
        db.delete(db_faculty)
        db.commit()
    return db_faculty
