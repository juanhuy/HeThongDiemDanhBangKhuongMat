from sqlalchemy import Column, String, Integer
from sqlalchemy.orm import relationship
from app.db.session import Base

class Classroom(Base):
    __tablename__ = 'classrooms'

    room_id = Column(String(20), primary_key=True)

    room_name = Column(String(100), nullable=False)
    building = Column(String(50), nullable=True)
    campus = Column(String(100), nullable=False)
    notes = Column(String(255), nullable=True)
    room_number = Column(String(20), nullable=False)

    camera_rtsp_url = Column(String(255), nullable=True)
    camera_status = Column(String(20), default='Online')
    
    capacity = Column(Integer, default=50)
    room_type = Column(String(50), default='Theory')
    status = Column(String(20), default='Active')

    schedules = relationship("ClassSchedule", back_populates="classroom")
    sessions = relationship("ClassSession", back_populates="classroom", cascade="all, delete-orphan")