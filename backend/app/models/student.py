from sqlalchemy import Column, Integer, String, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

class UserProfile(Base):
    __tablename__ = "user_profiles"

    profile_id = Column(Integer, primary_key=True, autoincrement=True)
    account_id = Column(Integer, ForeignKey("accounts.account_id", ondelete="SET NULL"), unique=True)
    
    full_name = Column(String(100), nullable=False)
    day_of_birth = Column(Date, nullable=True)
    gender = Column(String(10), nullable=True)

    citizen_id = Column(String(20), nullable=True)
    ethnicity = Column(String(50), nullable=True)
    religion = Column(String(50), nullable=True)
    nationality = Column(String(50), nullable=True)

    phone_number = Column(String(15))
    personal_email = Column(String(100))

    address = Column(Text, nullable=True)
    avatar_url = Column(String(255), nullable=True)

    account = relationship("Account", back_populates="profile")
    student_info = relationship("Student", back_populates="profile", uselist=False, cascade="all, delete-orphan")

class Student(Base):
    __tablename__ = "students"

    student_id = Column(String(20), primary_key=True)
    profile_id = Column(Integer, ForeignKey("user_profiles.profile_id", ondelete="CASCADE"), unique=True, nullable=False)
    
    administrative_class = Column(String(50))
    major = Column(String(100))
    specialization = Column(String(100))
    department = Column(String(100))
    cohort = Column(String(20))
    training_program = Column(String(50))
    academic_status = Column(String(50), default="Đang học")

    profile = relationship("UserProfile", back_populates="student_info")

    @property
    def full_name(self):
        return self.profile.full_name if self.profile else "N/A"

    @property
    def email(self):
        return self.profile.personal_email if self.profile else None

    @property
    def phone_number(self):
        return self.profile.phone_number if self.profile else None