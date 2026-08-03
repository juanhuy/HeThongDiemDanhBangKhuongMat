from sqlalchemy import Column, String, Integer, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class Lecturer(Base):
    __tablename__ = 'lecturers'

    lecturer_id = Column(String(20), primary_key=True)
    profile_id = Column(Integer, ForeignKey('user_profiles.profile_id', ondelete='CASCADE'), unique=True, nullable=False)
    
    department = Column(String(50), nullable=True)
    academic_title = Column(String(50), nullable=True)
    position = Column(String(100), nullable=True)
    employment_type = Column(String(50), nullable=True)
    teaching_status = Column(String(50), default='Active')
    hire_date = Column(Date, nullable=True)

    profile = relationship("UserProfile", back_populates="lecturer_info")
    classes = relationship("CreditClass", back_populates="lecturer", cascade="all, delete-orphan")
    busy_times = relationship("LecturerBusyTime", back_populates="lecturer", cascade="all, delete-orphan")

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
    def ethnicity(self):
        return self.profile.ethnicity if self.profile else None

    @property
    def religion(self):
        return self.profile.religion if self.profile else None

    @property
    def nationality(self):
        return self.profile.nationality if self.profile else None

    @property
    def address(self):
        return self.profile.address if self.profile else None

    @property
    def place_of_birth(self):
        return self.profile.place_of_birth if self.profile else None