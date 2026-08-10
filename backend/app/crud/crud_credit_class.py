from sqlalchemy.orm import Session
from app.models import CreditClass, Subject, Lecturer, UserProfile
from app.schemas.credit_class import CreditClassCreate, CreditClassUpdate

def get_credit_class(db: Session, class_id: str):
    return db.query(CreditClass).filter(CreditClass.class_id == class_id).first()

def get_credit_classes(db: Session, skip: int = 0, limit: int = 100, 
                       semester: int = None, academic_year: str = None, 
                       lecturer_id: str = None, subject_id: str = None):
    query = db.query(CreditClass)
    
    if semester: query = query.filter(CreditClass.semester == semester)
    if academic_year: query = query.filter(CreditClass.academic_year == academic_year)
    if lecturer_id: query = query.filter(CreditClass.lecturer_id == lecturer_id)
    if subject_id: query = query.filter(CreditClass.subject_id == subject_id)
        
    return query.offset(skip).limit(limit).all()

def create_credit_class(db: Session, credit_class: CreditClassCreate):
    db_class = CreditClass(**credit_class.model_dump())
    db.add(db_class)
    db.commit()
    db.refresh(db_class)
    return db_class

def update_credit_class(db: Session, class_id: str, credit_class_update: CreditClassUpdate):
    db_class = get_credit_class(db, class_id)
    if not db_class:
        return None
        
    update_data = credit_class_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_class, key, value)
        
    db.commit()
    db.refresh(db_class)
    return db_class

def delete_credit_class(db: Session, class_id: str):
    db_class = get_credit_class(db, class_id)
    if db_class:
        db.delete(db_class)
        db.commit() # Trigger current_students sẽ tự động tính toán lại
    return db_class