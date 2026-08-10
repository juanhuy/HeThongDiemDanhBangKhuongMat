from sqlalchemy import Column, String, ForeignKey
from app.db.session import Base

class Faculty(Base):
    __tablename__ = "faculties"
    faculty_id = Column(String(20), primary_key=True)
    faculty_name = Column(String(150), unique=True, nullable=False)
    dean_id = Column(String(20), ForeignKey("lecturers.lecturer_id"), nullable=True)
    office_room = Column(String(50), nullable=True)
    phone_number = Column(String(20), nullable=True)
    status = Column(String(20), default="Active")