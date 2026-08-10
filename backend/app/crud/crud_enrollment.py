from sqlalchemy.orm import Session
from app.models import ClassEnrollment, Student, UserProfile, CreditClass
from app.schemas.class_enrollment import ClassEnrollmentCreate

def enroll_student(db: Session, enrollment: ClassEnrollmentCreate):
    # Kiểm tra xem đã đăng ký chưa
    existing = db.query(ClassEnrollment).filter(
        ClassEnrollment.class_id == enrollment.class_id,
        ClassEnrollment.student_id == enrollment.student_id
    ).first()
    
    if existing:
        return existing # Đã đăng ký rồi thì bỏ qua
        
    db_enrollment = ClassEnrollment(**enrollment.model_dump())
    db.add(db_enrollment)
    db.commit() # Database Trigger sẽ tự động tăng current_students của CreditClass
    db.refresh(db_enrollment)
    return db_enrollment

def drop_student_class(db: Session, class_id: str, student_id: str):
    db_enrollment = db.query(ClassEnrollment).filter(
        ClassEnrollment.class_id == class_id,
        ClassEnrollment.student_id == student_id
    ).first()
    
    if db_enrollment:
        db.delete(db_enrollment)
        db.commit() # Database Trigger sẽ tự động giảm current_students
    return db_enrollment

def get_class_students(db: Session, class_id: str):
    """Lấy danh sách toàn bộ sinh viên trong một lớp tín chỉ"""
    return db.query(Student).join(ClassEnrollment).filter(ClassEnrollment.class_id == class_id).all()

def get_student_classes(db: Session, student_id: str):
    """Lấy danh sách các môn mà sinh viên này đang học"""
    return db.query(CreditClass).join(ClassEnrollment).filter(ClassEnrollment.student_id == student_id).all()