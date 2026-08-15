from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class Grade(Base):
    """Bảng điểm sinh viên theo môn — dùng để kiểm tra môn tiên quyết (đã ĐẬU).

    - score >= 5.0  -> ĐẬU môn (thoả tiên quyết "phải đậu").
    - score < 5.0   -> ĐÃ HỌC nhưng rớt (thoả "học trước").
    """
    __tablename__ = "grades"

    grade_id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(20), ForeignKey("students.student_id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(String(20), ForeignKey("subjects.subject_id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=False)       # thang 10
    semester = Column(Integer, nullable=True)   # học kỳ đã học
    status = Column(String(20), default="Passed")  # Passed / Failed

    student = relationship("Student")
    subject = relationship("Subject")
