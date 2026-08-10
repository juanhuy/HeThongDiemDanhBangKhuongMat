from sqlalchemy.orm import Session
from app.models.major import Major
from app.schemas.major import MajorCreate, MajorUpdate

def get_major(db: Session, major_id: str):
    return db.query(Major).filter(Major.major_id == major_id).first()

def get_majors(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Major).offset(skip).limit(limit).all()

def create_major(db: Session, major: MajorCreate):
    db_major = Major(**major.model_dump())
    db.add(db_major)
    db.commit()
    db.refresh(db_major)
    return db_major

def update_major(db: Session, db_major: Major, major_update: MajorUpdate):
    update_data = major_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_major, key, value)
    db.add(db_major)
    db.commit()
    db.refresh(db_major)
    return db_major

def delete_major(db: Session, major_id: str):
    db_major = get_major(db, major_id)
    if db_major:
        db.delete(db_major)
        db.commit()
    return db_major
