from sqlalchemy import Column, Integer, String, Date, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class UserProfile(Base):
    __tablename__ = 'user_profiles'

    profile_id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey('accounts.account_id', ondelete='SET NULL'), unique=True, nullable=True)
    
    full_name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(10), nullable=True)
    citizen_id = Column(String(20), unique=True, nullable=True)
    ethnicity = Column(String(50), nullable=True)
    religion = Column(String(50), nullable=True)
    nationality = Column(String(50), default='Việt Nam')
    phone_number = Column(String(15), nullable=True)
    personal_email = Column(String(100), nullable=True)
    address = Column(Text, nullable=True)
    place_of_birth = Column(String(100), nullable=True)
    avatar_url = Column(String(255), nullable=True)

    account = relationship("Account", back_populates="profile")
    student_info = relationship("Student", back_populates="profile", uselist=False, cascade="all, delete-orphan")
    lecturer_info = relationship("Lecturer", back_populates="profile", uselist=False, cascade="all, delete-orphan")