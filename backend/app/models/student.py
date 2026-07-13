from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.session import Base

class Student(Base):
    __tablename__ = "students"

    student_id = Column(String(20), primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.account_id"), unique=True, nullable=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    phone_number = Column(String(15), nullable=True)
    administrative_class = Column(String(50), nullable=True)
    major = Column(String(100), nullable=True)
    cohort = Column(String(20), nullable=True)
    training_program = Column(String(50), nullable=True)
    academic_status = Column(String(50), default="studying")