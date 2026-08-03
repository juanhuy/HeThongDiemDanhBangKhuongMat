from sqlalchemy import Column, Integer, String, Boolean, DateTime, LargeBinary, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class FaceFeature(Base):
    __tablename__ = 'face_features'

    feature_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(20), ForeignKey('students.student_id', ondelete='CASCADE'), nullable=False)
    
    face_vector = Column(LargeBinary, nullable=False)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    model_version = Column(String(50), default='buffalo_l')

    student = relationship("Student", back_populates="face_features")