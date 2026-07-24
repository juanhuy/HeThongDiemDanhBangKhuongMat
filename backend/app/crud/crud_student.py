from sqlalchemy.orm import Session, joinedload
from app.models.student import Student, UserProfile
from app.models.account import Account
from app.schemas.student import StudentCreate, StudentUpdate
from sqlalchemy import or_
import hashlib

def get_student(db: Session, student_id: str):
    # Dùng joinedload để load sẵn profile và account (Eager Loading) tránh lỗi N+1 Query
    return db.query(Student).options(
        joinedload(Student.profile).joinedload(UserProfile.account)
    ).filter(Student.student_id == student_id).first()

def get_students(db: Session, skip: int = 0, limit: int = 100, search: str = None, status: str = None):
    query = db.query(Student).options(joinedload(Student.profile))
    
    # Lọc qua bảng liên kết (UserProfile)
    if search:
        query = query.join(UserProfile).filter(or_(
            UserProfile.full_name.ilike(f"%{search}%"),
            Student.student_id.ilike(f"%{search}%")
        ))
    if status:
        query = query.filter(Student.academic_status == status)
        
    return query.offset(skip).limit(limit).all()

def create_student(db: Session, student: StudentCreate):
    # Bước 1: Tạo Account
    default_password_hash = hashlib.sha256("123456".encode()).hexdigest() 
    new_account = Account(
        username=student.student_id.strip().lower(), # Dùng MSSV làm username
        password_hash=default_password_hash,
        role="student",
        is_active=True
    )
    db.add(new_account)
    db.flush() # Lấy account_id

    # Bước 2: Tạo UserProfile
    new_profile = UserProfile(
        account_id=new_account.account_id,
        full_name=student.full_name,
        personal_email=student.email,
        phone_number=student.phone_number
    )
    db.add(new_profile)
    db.flush() # Lấy profile_id

    # Bước 3: Tạo Student
    new_student = Student(
        student_id=student.student_id,
        profile_id=new_profile.profile_id,
        administrative_class=student.administrative_class,
        major=student.major,
        cohort=student.cohort,
        training_program=student.training_program,
        academic_status=student.academic_status
    )
    db.add(new_student)
    
    db.commit()
    db.refresh(new_student)
    return new_student

def update_student(db: Session, db_student: Student, student_update: StudentUpdate):
    update_data = student_update.model_dump(exclude_unset=True)
    
    # 1. Tách các trường thuộc bảng UserProfile
    profile_fields = ["full_name", "email", "phone_number"]
    for field in profile_fields:
        if field in update_data:
            # Map trường email của API thành personal_email của DB
            db_field = "personal_email" if field == "email" else field
            setattr(db_student.profile, db_field, update_data[field])

    # 2. Tách các trường thuộc bảng Student
    student_fields = ["administrative_class", "academic_status"]
    for field in student_fields:
        if field in update_data:
            setattr(db_student, field, update_data[field])

    # 3. Logic: Khóa tài khoản nếu bảo lưu, thôi học, tốt nghiệp
    if "academic_status" in update_data:
        status = update_data["academic_status"]
        if status in ["Bảo lưu", "Đã tốt nghiệp", "Thôi học"]:
            db_student.profile.account.is_active = False
        else:
            db_student.profile.account.is_active = True
            
    db.commit()
    db.refresh(db_student)
    return db_student