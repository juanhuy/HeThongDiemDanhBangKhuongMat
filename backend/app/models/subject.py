from sqlalchemy import Column, String, Integer, Boolean, Computed, ForeignKey, DateTime
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
    credits = Column(Integer, Computed("theory_credits + practical_credits"))
    
    theory_periods = Column(Integer, Computed("theory_credits * 15"))
    practical_periods = Column(Integer, Computed("practical_credits * 45"))
    total_periods = Column(Integer, Computed("(theory_credits * 15) + (practical_credits * 45)"))

    faculty_id = Column(String(20), ForeignKey("faculties.faculty_id"))
    is_active = Column(Boolean, default=True)

    classes = relationship("CreditClass", back_populates="subject")
    faculty = relationship("Faculty", backref="subjects")

    created_at = Column(DateTime(timezone=True), default=get_vn_time)
    updated_at = Column(DateTime(timezone=True), default=get_vn_time, onupdate=get_vn_time)