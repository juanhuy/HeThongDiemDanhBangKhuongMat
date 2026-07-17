from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class AttendanceHistory(Base):
    __tablename__ = "attendance_histories"

    attendance_id = Column(Integer, primary_key=True, index=True, autoincrement=True) # id
    student_id = Column(String(20), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False) # mssv
    schedule_id = Column(Integer, ForeignKey("class_schedules.schedule_id", ondelete="CASCADE"), nullable=False) # ma_buoi_hoc
    check_in_time = Column(DateTime, default=func.now()) # thoi_gian_quet
    status = Column(String(20), nullable=False) # trang_thai (Co mat, Vang, Muon, Trẻ, v.v.)
    confirmed_by = Column(String(50), default="AI") # nguoi_xac_nhan

    student = relationship("Student")
    schedule = relationship("ClassSchedule")
