from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class CreditClass(Base):
    __tablename__ = 'credit_classes'

    class_id = Column(String(50), primary_key=True)
    subject_id = Column(String(20), ForeignKey('subjects.subject_id', ondelete='CASCADE'), nullable=False)
    lecturer_id = Column(String(20), ForeignKey('lecturers.lecturer_id', ondelete='CASCADE'), nullable=False)
    
    # administrative_class_id = Column(String(50), nullable=True)
    
    semester = Column(Integer, nullable=False)
    academic_year = Column(String(20), nullable=False)
    class_group = Column(String(20), nullable=True)
    max_students = Column(Integer, default=50)
    current_students = Column(Integer, default=0)
    status = Column(String(20), default='Active')

    subject = relationship("Subject", back_populates="classes")
    lecturer = relationship("Lecturer", back_populates="classes")
    enrollments = relationship("ClassEnrollment", back_populates="credit_class", cascade="all, delete-orphan")
    schedules = relationship("ClassSchedule", back_populates="credit_class", cascade="all, delete-orphan")
    sessions = relationship("ClassSession", back_populates="credit_class", cascade="all, delete-orphan")