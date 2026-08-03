from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class ClassEnrollment(Base):
    __tablename__ = 'class_enrollments'

    class_id = Column(String(50), ForeignKey('credit_classes.class_id', ondelete='CASCADE'), primary_key=True)
    student_id = Column(String(20), ForeignKey('students.student_id', ondelete='CASCADE'), primary_key=True)
    
    enrollment_date = Column(DateTime, server_default=func.now())
    status = Column(String(20), default='Enrolled')
    updated_at = Column(DateTime, onupdate=func.now())

    credit_class = relationship("CreditClass", back_populates="enrollments")
    student = relationship("Student", back_populates="enrollments")