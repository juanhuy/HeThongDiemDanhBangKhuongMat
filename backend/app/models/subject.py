from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.db.session import Base
from sqlalchemy.sql import func

from datetime import datetime, timezone, timedelta

VN_TZ = timezone(timedelta(hours=7))

def get_vn_time():
    """Hàm trả về thời gian hiện tại theo chuẩn UTC+7"""
    return datetime.now(VN_TZ)

class Subject(Base):
    __tablename__ = 'subjects'

    subject_id = Column(String(20), primary_key=True)
    subject_name = Column(String(150), nullable=False)
    theory_credits = Column(Integer, default=0)
    practical_credits = Column(Integer, default=0)
    credits = Column(Integer, default=0)

    theory_periods = Column(Integer, default=0)
    practical_periods = Column(Integer, default=0)
    total_periods = Column(Integer, default=0)

    semester = Column(Integer, nullable=True) # Học kỳ dự kiến 1..9
    prerequisites = Column(String(255), nullable=True) # Các mã môn tiên quyết
    faculty_id = Column(String(20), ForeignKey("faculties.faculty_id"))
    is_active = Column(Boolean, default=True)

    classes = relationship("CreditClass", back_populates="subject")
    faculty = relationship("Faculty", backref="subjects")

    created_at = Column(DateTime(timezone=True), default=get_vn_time)
    updated_at = Column(DateTime(timezone=True), default=get_vn_time, onupdate=get_vn_time)
