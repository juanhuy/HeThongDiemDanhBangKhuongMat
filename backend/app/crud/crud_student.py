from sqlalchemy.orm import Session
from app.models.student import Student
from app.models.account import Account
from app.schemas.student import StudentCreate, StudentUpdate
from sqlalchemy import or_
from app.core.security import get_password_hash

def get_student(db: Session, student_id: str):
    return db.query(Student).filter(Student.student_id == student_id).first()

def get_students(db: Session, skip: int = 0, limit: int = 100, search: str = None, status: str = None):
    query = db.query(Student)
    
    if search:
        # Tìm kiếm theo tên hoặc MSSV
        query = query.filter(or_(
            Student.full_name.ilike(f"%{search}%"),
            Student.student_id.ilike(f"%{search}%")
        ))
    if status:
        # Lọc theo trạng thái học tập
        query = query.filter(Student.academic_status == status)
        
    return query.offset(skip).limit(limit).all()

def create_student(db: Session, student: StudentCreate):
    import hashlib
    default_password_hash = hashlib.sha256("123456".encode()).hexdigest() 
    
    new_account = Account(
        username=student.student_id.strip().lower(),
        password_hash=default_password_hash,
        role="sinh_vien",
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
    
    # Cập nhật thông tin sinh viên
    for key, value in update_data.items():
        setattr(db_student, key, value)
        
    # Logic nghiệp vụ: Khóa tài khoản nếu trạng thái là graduated hoặc dropped_out
    if "academic_status" in update_data:
        new_status = update_data["academic_status"]
        if new_status in ["graduated", "dropped_out"]:
            account = db.query(Account).filter(Account.account_id == db_student.account_id).first()
            if account:
                account.is_active = False
        elif new_status == "studying":
            account = db.query(Account).filter(Account.account_id == db_student.account_id).first()
            if account:
                account.is_active = True
                
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