from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class LecturerBusyTime(Base):
    __tablename__ = 'lecturer_busy_times'

    busy_id = Column(Integer, primary_key=True, autoincrement=True)
    lecturer_id = Column(String(20), ForeignKey('lecturers.lecturer_id', ondelete='CASCADE'), nullable=False)
    semester_id = Column(String(20), nullable=False)
    
    day_of_week = Column(Integer, nullable=False)
    start_shift = Column(Integer, nullable=False)
    end_shift = Column(Integer, nullable=False)
    notes = Column(String(255), nullable=True)

    lecturer = relationship("Lecturer", back_populates="busy_times")
