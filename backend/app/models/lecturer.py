from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.session import Base

class Lecturer(Base):
    __tablename__ = "lecturers"

    lecturer_id = Column(String(20), primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.account_id"), unique=True, nullable=True)
    full_name = Column(String(50), nullable=False)
    email = Column(String(50), unique=True, nullable=False)
    phone_number = Column(String(15), nullable=True)
    department = Column(String(50), nullable=True)
