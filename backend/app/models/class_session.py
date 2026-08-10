from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class ClassSession(Base):
    __tablename__ = 'class_sessions'

    session_id = Column(Integer, primary_key=True, autoincrement=True)
    class_id = Column(String(50), ForeignKey('credit_classes.class_id', ondelete='CASCADE'), nullable=False)
    room_id = Column(String(20), ForeignKey('classrooms.room_id', ondelete='RESTRICT'), nullable=False)
    session_date = Column(Date, nullable=False)
    shift = Column(Integer, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    session_type = Column(String(20), default='Theory')
    status = Column(String(20), default='Scheduled')
    notes = Column(String(255), nullable=True)

    # Relationships
    credit_class = relationship('CreditClass', back_populates='sessions')
    classroom = relationship('Classroom', back_populates='sessions')
    attendance_records = relationship('AttendanceRecord', back_populates='class_session', cascade='all, delete-orphan')
