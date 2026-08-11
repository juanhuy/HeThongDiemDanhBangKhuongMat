from app import schemas
from sqlalchemy.orm import Session
from app.models.subject import Subject
from app.schemas.subject import SubjectCreate
from sqlalchemy import or_
from sqlalchemy.orm import joinedload

def get_subjects(db: Session, skip: int = 0, limit: int = 100):
    return (
        db.query(Subject)
        .options(joinedload(Subject.faculty))  # kéo data khoa
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_subject_by_id(db: Session, subject_id: str):
    return (
        db.query(Subject)
        .options(joinedload(Subject.faculty))  # kéo data khoa
        .filter(Subject.subject_id == subject_id)
        .first()
    )

def _fill_calculated_fields(subject_data: dict):
    """Tự tính credits & số tiết từ tín chỉ lý thuyết/thực hành."""
    theory = int(subject_data.get('theory_credits') or 0)
    practical = int(subject_data.get('practical_credits') or 0)
    subject_data['credits'] = theory + practical
    subject_data['theory_periods'] = theory * 15
    subject_data['practical_periods'] = practical * 45
    subject_data['total_periods'] = (theory * 15) + (practical * 45)


def create_subject(db: Session, subject: SubjectCreate):
    subject_data = subject.model_dump()
    _fill_calculated_fields(subject_data)

    db_subject = Subject(**subject_data)
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
    
    # Nếu có thay đổi tín chỉ lý thuyết/thực hành thì tính lại credits & số tiết
    if 'theory_credits' in update_data or 'practical_credits' in update_data:
        theory = int(db_obj.theory_credits or 0)
        practical = int(db_obj.practical_credits or 0)
        db_obj.credits = theory + practical
        db_obj.theory_periods = theory * 15
        db_obj.practical_periods = practical * 45
        db_obj.total_periods = (theory * 15) + (practical * 45)

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

def delete_subject(db: Session, subject_id: str):
    db_obj = get_subject_by_id(db, subject_id=subject_id)
    if not db_obj:
        return None
    db.delete(db_obj)
    db.commit()
    return db_obj
