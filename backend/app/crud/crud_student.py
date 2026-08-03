from sqlalchemy.orm import Session
from app.models import Student, UserProfile, Account, ClassEnrollment, CreditClass
from app.schemas.student import StudentCreate, StudentUpdate
from sqlalchemy import or_
from app.core.security import get_password_hash

def get_student(db: Session, student_id: str):
    return db.query(Student).filter(Student.student_id == student_id.strip().upper()).first()

def get_students(db: Session, skip: int = 0, limit: int = 100, search: str = None, status: str = None, lecturer_id: str = None):
    query = db.query(Student)
    
    if lecturer_id:
        query = query.join(ClassEnrollment).join(CreditClass).filter(CreditClass.lecturer_id == lecturer_id.strip())
        
    if search:
        # Tìm kiếm theo tên (trong UserProfile) hoặc MSSV
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
    default_password_hash = get_password_hash("123456")
    
    username_lower = student.student_id.strip().lower()
    existing_account = db.query(Account).filter(Account.username == username_lower).first()
    
    if existing_account:
        new_account = existing_account
    else:
        new_account = Account(
            username=username_lower,
            password_hash=default_password_hash,
            role="sinh_vien",
            is_active=True
        )
        db.add(new_account)
        db.flush()
    
    # Tạo UserProfile liên kết
    profile = db.query(UserProfile).filter(UserProfile.account_id == new_account.account_id).first()
    if not profile:
        profile = UserProfile(
            account_id=new_account.account_id,
            full_name=student.full_name,
            personal_email=student.email,
            phone_number=student.phone_number,
            date_of_birth=getattr(student, 'date_of_birth', None),
            gender=getattr(student, 'gender', None),
            citizen_id=getattr(student, 'citizen_id', None),
            ethnicity=getattr(student, 'ethnicity', None),
            religion=getattr(student, 'religion', None),
            nationality=getattr(student, 'nationality', 'Việt Nam'),
            place_of_birth=getattr(student, 'place_of_birth', None),
            address=getattr(student, 'address', None)
        )
        db.add(profile)
        db.flush()
    
    db_student = Student(
        student_id=student.student_id.strip().upper(),
        profile_id=profile.profile_id,
        administrative_class=student.administrative_class,
        major=student.major,
        specialization=student.specialization, # Mới thêm
        department=student.department,         # Mới thêm
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
        if key in ["full_name", "email", "phone_number", "address"]:
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
            elif key == "address":
                db_student.profile.address = value
        else:
            setattr(db_student, key, value)
        
    # Logic nghiệp vụ: Khóa tài khoản nếu trạng thái là tốt nghiệp hoặc thôi học
    if "academic_status" in update_data:
        new_status = update_data["academic_status"]
        if new_status in ["Thôi học", "Đã tốt nghiệp", "Đình chỉ"]:
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