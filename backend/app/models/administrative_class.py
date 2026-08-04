from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class AdministrativeClass(Base):
    __tablename__ = 'administrative_classes'

    class_id = Column(String(50), primary_key=True)
    class_name = Column(String(100), nullable=False)
    
    faculty_id = Column(String(20), ForeignKey("faculties.faculty_id"))
    major_id = Column(String(20), ForeignKey("majors.major_id"))
    cohort = Column(String(20), nullable=False)
    
    advisor_id = Column(String(20), ForeignKey("lecturers.lecturer_id", ondelete="SET NULL"), nullable=True)
    
    status = Column(String(20), default="Active")
    created_at = Column(DateTime, default=func.now())
    
    # Mối quan hệ
    advisor = relationship("Lecturer", foreign_keys=[advisor_id])
    students = relationship("Student", backref="admin_class")
