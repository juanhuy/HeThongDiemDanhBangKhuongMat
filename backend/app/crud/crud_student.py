from sqlalchemy.orm import Session
from app.models.student import Student, UserProfile
from app.models.account import Account
from app.schemas.student import StudentCreate, StudentUpdate
from sqlalchemy import or_
from app.core.security import get_password_hash

def get_student(db: Session, student_id: str):
    return db.query(Student).filter(Student.student_id == student_id.strip().upper()).first()

def get_students(db: Session, skip: int = 0, limit: int = 100, search: str = None, status: str = None, lecturer_id: str = None):
    query = db.query(Student)
    
    if lecturer_id:
        from app.models.student_class import StudentClassEnrollment
        from app.models.credit_class import CreditClass
        query = query.join(StudentClassEnrollment).join(CreditClass).filter(CreditClass.lecturer_id == lecturer_id.strip())
        
    if search:
        # Tìm kiếm theo tên (trong UserProfile) hoặc MSSV
        from app.models.student import UserProfile
        query = query.join(UserProfile).filter(or_(
            UserProfile.full_name.ilike(f"%{search}%"),
            Student.student_id.ilike(f"%{search}%")
        ))
    if status:
        # Lọc theo trạng thái học tập
        query = query.filter(Student.academic_status == status)
        
    # Loại bỏ bản ghi trùng lặp (nếu sinh viên đăng ký nhiều lớp của cùng giảng viên)
    if lecturer_id:
        query = query.distinct()
        
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
    db.flush()
    
    # Tạo UserProfile liên kết
    profile = UserProfile(
        account_id=new_account.account_id,
        full_name=student.full_name,
        personal_email=student.email,
        phone_number=student.phone_number
    )
    db.add(profile)
    db.flush()
    
    db_student = Student(
        student_id=student.student_id.strip().upper(),
        profile_id=profile.profile_id,
        administrative_class=student.administrative_class,
        major=student.major,
        cohort=student.cohort,
        training_program=student.training_program,
        academic_status=student.academic_status or "Đang học"
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    
    return db_student

def update_student(db: Session, db_student: Student, student_update: StudentUpdate):
    update_data = student_update.model_dump(exclude_unset=True)
    
    # Cập nhật thông tin sinh viên và hồ sơ cá nhân
    for key, value in update_data.items():
        if key in ["full_name", "email", "phone_number"]:
            if not db_student.profile:
                profile = UserProfile(
                    account_id=None,
                    full_name="",
                )
                db.add(profile)
                db.flush()
                db_student.profile_id = profile.profile_id
            
            if key == "full_name":
                db_student.profile.full_name = value
            elif key == "email":
                db_student.profile.personal_email = value
            elif key == "phone_number":
                db_student.profile.phone_number = value
        else:
            setattr(db_student, key, value)
        
    # Logic nghiệp vụ: Khóa tài khoản nếu trạng thái là graduated hoặc dropped_out
    if "academic_status" in update_data:
        new_status = update_data["academic_status"]
        if new_status in ["graduated", "dropped_out", "Thôi học", "Tốt nghiệp"]:
            if db_student.profile and db_student.profile.account:
                db_student.profile.account.is_active = False
        elif new_status in ["studying", "Đang học"]:
            if db_student.profile and db_student.profile.account:
                db_student.profile.account.is_active = True
                
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