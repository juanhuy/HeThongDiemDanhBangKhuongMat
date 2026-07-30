from sqlalchemy import Column, Integer, String, Boolean, DateTime, LargeBinary, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base

class FaceFeature(Base):
    __tablename__ = "face_features"

    feature_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(String(20), ForeignKey("students.student_id", ondelete="CASCADE"))
    # LONGBLOB trong MySQL tương đương LargeBinary trong SQLAlchemy
    face_vector = Column(LargeBinary, nullable=False) 
    is_primary = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())