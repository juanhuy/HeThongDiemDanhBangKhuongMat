from sqlalchemy import Column, Integer, String, Boolean
from app.db.session import Base

class Subject(Base):
    __tablename__ = "subjects"

    subject_id = Column(String(20), primary_key=True, index=True)
    subject_name = Column(String(150), nullable=False)
    credits = Column(Integer, nullable=False)
    semester = Column(Integer, nullable=True) # Học kỳ dự kiến 1..9 (1,2,3 Hè=8,9)
    prerequisites = Column(String(255), nullable=True) # Các mã môn tiên quyết, phân tách bởi dấu ","
    is_active = Column(Boolean, default=True)