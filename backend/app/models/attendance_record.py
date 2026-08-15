from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class AttendanceRecord(Base):
    __tablename__ = 'attendance_records'

    record_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey('class_sessions.session_id', ondelete='CASCADE'), nullable=False)
    student_id = Column(String(20), ForeignKey('students.student_id', ondelete='CASCADE'), nullable=False)
    status = Column(String(20), nullable=False)
    recorded_at = Column(DateTime, nullable=True)
    confidence_score = Column(Float, nullable=True)
    proof_image_url = Column(String(255), nullable=True)
    notes = Column(String(255), nullable=True)
    updated_by = Column(Integer, ForeignKey('accounts.account_id', ondelete='SET NULL'), nullable=True)
    # Check-in / Check-out: check_out_time = thời điểm SV rời lớp (NULL = đang có mặt);
    # last_seen = lần quét cuối của camera để phát hiện SV đã đi ra.
    check_out_time = Column(DateTime, nullable=True)
    last_seen = Column(DateTime, nullable=True)
    # Nguồn điểm danh: "AI" (camera tự động) / "manual" (giảng viên thủ công)
    source = Column(String(20), nullable=True)

    class_session = relationship('ClassSession', back_populates='attendance_records')
    student = relationship('Student', back_populates='attendance_records')
    updated_by_account = relationship('Account')
