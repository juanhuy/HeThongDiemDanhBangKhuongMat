from sqlalchemy import Column, Integer, String, Boolean
from app.db.session import Base

class Subject(Base):
    __tablename__ = "subjects"

    subject_id = Column(String(20), primary_key=True, index=True)
    subject_name = Column(String(150), nullable=False)
    credits = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)