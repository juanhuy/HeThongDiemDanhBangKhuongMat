from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class ClassSchedule(Base):
    __tablename__ = 'class_schedules'

    schedule_id = Column(Integer, primary_key=True, autoincrement=True)
    class_id = Column(String(50), ForeignKey('credit_classes.class_id', ondelete='CASCADE'), nullable=False)

    # --- Cột cũ (nhánh main, dùng cho nghiệp vụ điểm danh lịch theo ngày) ---
    study_date = Column(Date, nullable=True)
    room = Column(String(20), nullable=True)
    start_time = Column(Time, nullable=True)

    # --- Cột mới (nhánh phu, xếp lịch theo tiết) ---
    room_id = Column(String(20), ForeignKey('classrooms.room_id', ondelete='RESTRICT'), nullable=True)
    day_of_week = Column(Integer, nullable=True)
    start_shift = Column(Integer, nullable=True)
    end_shift = Column(Integer, nullable=True)

    credit_class = relationship("CreditClass", back_populates="schedules")
    classroom = relationship("Classroom", back_populates="schedules")

