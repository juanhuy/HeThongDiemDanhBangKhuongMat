
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.lecturer import Lecturer
from app.models.account import Account
from app.schemas.lecturer import LecturerCreate, LecturerUpdate
from app.core.security import get_password_hash

def get_lecturer(db: Session, lecturer_id: str):
    return db.query(Lecturer).filter(Lecturer.lecturer_id == lecturer_id).first()

def get_lecturers(db: Session, skip: int = 0, limit: int = 100, search: str = None):
    query = db.query(Lecturer)
    if search:
        query = query.filter(or_(
            Lecturer.full_name.ilike(f"%{search}%"),
            Lecturer.lecturer_id.ilike(f"%{search}%")
        ))
    return query.offset(skip).limit(limit).all()

def create_lecturer(db: Session, lecturer: LecturerCreate):
    # Bước 1: Tạo tài khoản với role='lecturer'
    # default_password_hash = f"hashed_{lecturer.lecturer_id}"
    default_password_hash = get_password_hash(lecturer.lecturer_id)
    new_account = Account(
        username=lecturer.lecturer_id,
        password_hash=default_password_hash,
        role="lecturer",
        is_active=True
    )
    db.add(new_account)
    db.flush() # Đẩy xuống DB để lấy ID
    
    # Bước 2: Tạo hồ sơ giảng viên
    db_lecturer = Lecturer(**lecturer.model_dump(), account_id=new_account.account_id)
    db.add(db_lecturer)
    db.commit()
    db.refresh(db_lecturer)
    return db_lecturer

def update_lecturer(db: Session, db_lecturer: Lecturer, lecturer_update: LecturerUpdate):
    update_data = lecturer_update.model_dump(exclude_unset=True)
    
    # Rút trường is_active ra khỏi dict vì nó thuộc về bảng Account, không nằm trong bảng Lecturer
    is_active_val = update_data.pop("is_active", None)
    
    # Cập nhật thông tin trên bảng Lecturer
    for key, value in update_data.items():
        setattr(db_lecturer, key, value)
        
    # Logic nghiệp vụ: Khóa/Mở khóa trên bảng Account
    if is_active_val is not None and db_lecturer.account_id:
        account = db.query(Account).filter(Account.account_id == db_lecturer.account_id).first()
        if account:
            account.is_active = is_active_val
            
    db.add(db_lecturer)
    db.commit()
    db.refresh(db_lecturer)
    return db_lecturer