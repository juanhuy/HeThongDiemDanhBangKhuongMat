from sqlalchemy.orm import Session
from app.models.student import Student
from app.models.account import Account
from app.schemas.student import StudentCreate, StudentUpdate

def get_student(db: Session, student_id: str):
    return db.query(Student).filter(Student.student_id == student_id).first()

def get_students(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Student).offset(skip).limit(limit).all()

def create_student(db: Session, student: StudentCreate):
    # Bước 1: Tạo tài khoản (Account) trước
    # Giả định mật khẩu mặc định là mã sinh viên (Cần mã hóa Bcrypt trong thực tế)
    default_password_hash = f"hashed_{student.student_id}" 
    
    new_account = Account(
        username=student.student_id,
        password_hash=default_password_hash,
        role="student",
        is_active=True
    )
    db.add(new_account)
    db.flush() # flush() sẽ đẩy dữ liệu xuống DB để lấy account_id tự tăng mà chưa commit
    
    # Bước 2: Tạo hồ sơ Sinh viên (Student) với account_id vừa lấy được
    student_data = student.model_dump() # Nếu dùng Pydantic v1 thì dùng student.dict()
    db_student = Student(**student_data, account_id=new_account.account_id)
    
    db.add(db_student)
    
    # Bước 3: Lưu toàn bộ (Commit Transaction)
    db.commit()
    db.refresh(db_student)
    
    return db_student

def update_student(db: Session, db_student: Student, student_update: StudentUpdate):
    update_data = student_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_student, key, value)
    
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

def delete_student(db: Session, student_id: str):
    db_student = get_student(db, student_id)
    if db_student:
        db.delete(db_student)
        db.commit()
    return db_student