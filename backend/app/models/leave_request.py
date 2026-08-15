from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    request_id = Column(Integer, primary_key=True, index=True, autoincrement=True) # id
    student_id = Column(String(20), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False) # mssv
    schedule_id = Column(Integer, ForeignKey("class_schedules.schedule_id", ondelete="CASCADE"), nullable=True) # ma_buoi_hoc (lịch cũ)
    session_id = Column(Integer, ForeignKey("class_sessions.session_id", ondelete="CASCADE"), nullable=True) # buổi học mới (class_sessions)
    reason = Column(Text, nullable=True) # ly_do
    evidence = Column(String(255), nullable=True) # minh_chung
    status = Column(String(20), default="Pending") # trang_thai (Pending, Approved, Rejected)
    approved_by = Column(String(50), nullable=True) # nguoi_duyet

    student = relationship("Student")
    schedule = relationship("ClassSchedule")
    session = relationship("ClassSession")
