from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from app.db.session import Base

# ==========================================
# BẢNG TRUNG GIAN: Phân luồng Lớp Biên Chế
# ==========================================
class ExpectedClassMapping(Base):
    __tablename__ = 'expected_class_mappings'

    id = Column(Integer, primary_key=True, autoincrement=True)
    credit_class_id = Column(String(50), ForeignKey('credit_classes.class_id', ondelete='CASCADE'), nullable=False)
    admin_class_id = Column(String(50), ForeignKey('administrative_classes.class_id', ondelete='CASCADE'), nullable=False)

# ==========================================
# BẢNG CHÍNH: Lớp tín chỉ
# ==========================================
class CreditClass(Base):
    __tablename__ = 'credit_classes'

    class_id = Column(String(50), primary_key=True)
    parent_class_id = Column(String(50), ForeignKey('credit_classes.class_id', ondelete='CASCADE'), nullable=True)

    subject_id = Column(String(20), ForeignKey('subjects.subject_id', ondelete='CASCADE'), nullable=False)
    lecturer_id = Column(String(20), ForeignKey('lecturers.lecturer_id', ondelete='CASCADE'), nullable=True)
    semester_id = Column(String(20), ForeignKey('semesters.semester_id', ondelete='CASCADE'), nullable=False)
    semester = Column(Integer, nullable=True) # Học kỳ của lớp (1, 2, 3, Hè=8/9)
    academic_year = Column(String(20), nullable=True) # Niên khóa học (VD: 2025-2026)
    cohort = Column(String(20), nullable=True) # Khóa được phép đăng ký (VD: D22)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    group_number = Column(Integer, nullable=False, default=1)
    sub_group_number = Column(Integer, nullable=True)
    class_type = Column(String(20), default='Combined')
    start_week = Column(Integer, nullable=True)
    end_week = Column(Integer, nullable=True)

    max_students = Column(Integer, default=50)
    current_students = Column(Integer, default=0)
    status = Column(String(20), default='Active')

    # --- RELATIONSHIPS ---
    subject = relationship("Subject", back_populates="classes")
    lecturer = relationship("Lecturer", back_populates="classes")
    
    # Quan hệ cha-con (Nhóm chứa nhiều Tổ )
    sub_groups = relationship("CreditClass", backref=backref("parent_class", remote_side=[class_id]))
    
    # Quan hệ với bảng trung gian để lấy danh sách Lớp hành chính được gán
    expected_mappings = relationship("ExpectedClassMapping", backref="credit_class", cascade="all, delete-orphan")
    sessions = relationship("ClassSession", back_populates="credit_class", cascade="all, delete-orphan")
    enrollments = relationship("ClassEnrollment", back_populates="credit_class", cascade="all, delete-orphan")
    schedules = relationship("ClassSchedule", back_populates="credit_class", cascade="all, delete-orphan")