from sqlalchemy.orm import Session
from app.models import Student, UserProfile, Account, ClassEnrollment, CreditClass, AdministrativeClass, Faculty, Major
from app.schemas.student import StudentCreate, StudentUpdate
from sqlalchemy import or_
from app.core.security import get_password_hash
from app.core.student_status import (
    normalize_academic_status,
    is_active_student,
    ACADEMIC_STATUS_ACTIVE,
    ACCOUNT_LOCKED_STATUSES,
)

def get_student(db: Session, student_id: str):
    return db.query(Student).filter(Student.student_id == student_id.strip().upper()).first()

def get_students(db: Session, skip: int = 0, limit: int = 100, search: str = None, status: str = None, lecturer_id: str = None, cohort: str = None, faculty_id: str = None, administrative_class: str = None):
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
        # Lọc theo trạng thái học tập (chuẩn hoá để nhận cả giá trị tiếng Anh cũ)
        query = query.filter(Student.academic_status == normalize_academic_status(status))
    if cohort:
        # Lọc theo khóa (linh hoạt: 'D22' hoặc '2022-2027')
        query = query.filter(Student.cohort.ilike(f"%{cohort.strip()}%"))
    if faculty_id:
        query = query.filter(Student.faculty_id == faculty_id.strip())
    if administrative_class:
        query = query.filter(Student.administrative_class_id == administrative_class.strip())
        
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
    
    # Đảm bảo Khoa tồn tại
    if student.faculty_id:
        fac_id = student.faculty_id.strip()
        faculty = db.query(Faculty).filter(Faculty.faculty_id == fac_id).first()
        if not faculty:
            faculty = Faculty(faculty_id=fac_id, faculty_name=fac_id)
            db.add(faculty)
            db.flush()
            
    # Đảm bảo Ngành tồn tại
    if student.major_id:
        maj_id = student.major_id.strip()
        major = db.query(Major).filter(Major.major_id == maj_id).first()
        if not major:
            major = Major(major_id=maj_id, major_name=maj_id, faculty_id=student.faculty_id)
            db.add(major)
            db.flush()

    # Đảm bảo AdministrativeClass tồn tại
    if student.administrative_class:
        class_id = student.administrative_class.strip()
        admin_class = db.query(AdministrativeClass).filter(AdministrativeClass.class_id == class_id).first()
        if not admin_class:
            admin_class = AdministrativeClass(
                class_id=class_id,
                class_name=class_id,
                faculty_id=student.faculty_id,
                major_id=student.major_id,
                cohort=student.cohort or "Chưa rõ"
            )
            db.add(admin_class)
            db.flush()

    db_student = Student(
        student_id=student.student_id.strip().upper(),
        profile_id=profile.profile_id,
        administrative_class_id=student.administrative_class,
        major_id=student.major_id,
        specialization=student.specialization, # Mới thêm
        faculty_id=student.faculty_id,         # Mới thêm
        cohort=student.cohort,
        training_program=student.training_program,
        academic_status=normalize_academic_status(student.academic_status) or ACADEMIC_STATUS_ACTIVE
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
            if key == "faculty_id" and value:
                fac_id = value.strip()
                faculty = db.query(Faculty).filter(Faculty.faculty_id == fac_id).first()
                if not faculty:
                    faculty = Faculty(faculty_id=fac_id, faculty_name=fac_id)
                    db.add(faculty)
                    db.flush()
                    
            if key == "major_id" and value:
                maj_id = value.strip()
                major = db.query(Major).filter(Major.major_id == maj_id).first()
                if not major:
                    major = Major(major_id=maj_id, major_name=maj_id, faculty_id=db_student.faculty_id)
                    db.add(major)
                    db.flush()

            if key == "administrative_class" and value:
                class_id = value.strip()
                admin_class = db.query(AdministrativeClass).filter(AdministrativeClass.class_id == class_id).first()
                if not admin_class:
                    admin_class = AdministrativeClass(
                        class_id=class_id,
                        class_name=class_id,
                        faculty_id=db_student.faculty_id,
                        major_id=db_student.major_id,
                        cohort=db_student.cohort or "Chưa rõ"
                    )
                    db.add(admin_class)
                    db.flush()
            setattr(db_student, key, value)
    # Logic nghiệp vụ: chuẩn hoá trạng thái + khoá/mở khoá tài khoản
    if "academic_status" in update_data:
        new_status = normalize_academic_status(update_data["academic_status"])
        db_student.academic_status = new_status
        if db_student.profile and db_student.profile.account:
            # Bảo lưu vẫn được đăng nhập (xem hồ sơ) nhưng không tham gia
            # điểm danh/đăng ký; chỉ khoá tài khoản khi Tốt nghiệp/Thôi học/Đình chỉ.
            db_student.profile.account.is_active = new_status not in ACCOUNT_LOCKED_STATUSES
                
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