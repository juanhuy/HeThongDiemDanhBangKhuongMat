from sqlalchemy import Column, String, ForeignKey
from app.db.session import Base

class Major(Base):
    __tablename__ = "majors"
    major_id = Column(String(20), primary_key=True)
    major_name = Column(String(150), unique=True, nullable=False)
    faculty_id = Column(String(20), ForeignKey("faculties.faculty_id"), nullable=False)
    degree_level = Column(String(50), default="Bachelors")