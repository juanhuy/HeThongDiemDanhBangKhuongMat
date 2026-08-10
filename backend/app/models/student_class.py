from sqlalchemy import Column, String, ForeignKey, PrimaryKeyConstraint, Index
from sqlalchemy.orm import relationship
from app.db.session import Base

class StudentClassEnrollment(Base):
    __tablename__ = "student_class_enrollment"

    class_id = Column(String(50), ForeignKey("credit_classes.class_id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String(20), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    academic_status = Column(String(20), default="Active") # Active, Cam thi

    __table_args__ = (
        PrimaryKeyConstraint("class_id", "student_id"),
        Index("ix_sce_class", "class_id"),
    )

    credit_class = relationship("CreditClass")
    student = relationship("Student")
