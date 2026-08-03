from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class ClassSchedule(Base):
    __tablename__ = 'class_schedules'

    schedule_id = Column(Integer, primary_key=True, autoincrement=True)
    class_id = Column(String(50), ForeignKey('credit_classes.class_id', ondelete='CASCADE'), nullable=False)
    room_id = Column(String(20), ForeignKey('classrooms.room_id', ondelete='RESTRICT'), nullable=False)
    
    day_of_week = Column(Integer, nullable=False)
    start_shift = Column(Integer, nullable=False)
    end_shift = Column(Integer, nullable=False)

    credit_class = relationship("CreditClass", back_populates="schedules")
    classroom = relationship("Classroom", back_populates="schedules")

