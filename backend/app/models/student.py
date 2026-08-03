from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class Student(Base):
    __tablename__ = 'students'

    student_id = Column(String(20), primary_key=True)
    profile_id = Column(Integer, ForeignKey('user_profiles.profile_id', ondelete='CASCADE'), unique=True, nullable=False)
    
    administrative_class = Column(String(50), nullable=True)
    major = Column(String(100), nullable=True)
    specialization = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True)
    cohort = Column(String(20), nullable=True)
    training_program = Column(String(50), nullable=True)
    academic_status = Column(String(50), nullable=True)

    profile = relationship("UserProfile", back_populates="student_info")
    face_features = relationship("FaceFeature", back_populates="student", cascade="all, delete-orphan")
    enrollments = relationship("ClassEnrollment", back_populates="student", cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")

    @property
    def full_name(self):
        return self.profile.full_name if self.profile else None

    @property
    def email(self):
        return self.profile.personal_email if self.profile else None

    @property
    def phone_number(self):
        return self.profile.phone_number if self.profile else None

    @property
    def date_of_birth(self):
        return self.profile.date_of_birth if self.profile else None

    @property
    def gender(self):
        return self.profile.gender if self.profile else None

    @property
    def citizen_id(self):
        return self.profile.citizen_id if self.profile else None

    @property
    def address(self):
        return self.profile.address if self.profile else None

    @property
    def ethnicity(self):
        return self.profile.ethnicity if self.profile else None

    @property
    def religion(self):
        return self.profile.religion if self.profile else None

    @property
    def nationality(self):
        return self.profile.nationality if self.profile else None

    @property
    def place_of_birth(self):
        return self.profile.place_of_birth if self.profile else None