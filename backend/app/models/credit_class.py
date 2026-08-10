from sqlalchemy import Column, String, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class CreditClass(Base):
    __tablename__ = "credit_classes"

    class_id = Column(String(50), primary_key=True, index=True) # ma_lop_tc
    subject_id = Column(String(20), ForeignKey("subjects.subject_id", ondelete="CASCADE"), nullable=False) # ma_mon
    lecturer_id = Column(String(20), ForeignKey("lecturers.lecturer_id", ondelete="SET NULL"), nullable=True) # ma_gv

    semester = Column(Integer, nullable=True) # Học kỳ của lớp (1, 2, 3, Hè=8/9)
    academic_year = Column(String(20), nullable=True) # Niên khóa học (VD: 2025-2026)
    cohort = Column(String(20), nullable=True) # Khóa được phép đăng ký (VD: D22)
    max_students = Column(Integer, default=50) # Sĩ số tối đa
    current_students = Column(Integer, default=0) # Sĩ số hiện tại (duy trì thủ công + backfill)
    status = Column(String(20), default="Active") # Active / Planning / Completed / Cancelled
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    subject = relationship("Subject")
    lecturer = relationship("Lecturer")

