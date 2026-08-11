from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.session import Base


class PresenceSnapshot(Base):
    """Snapshot hiện diện thụ động của camera trong phòng học.

    Mỗi lần camera quét định kỳ, mỗi SV nhận diện được trong khung hình
    sẽ có 1 dòng. Dùng để đối chiếu với check-in (cổng) và hiển thị
    số lượng SV đang có mặt cho giảng viên.
    """
    __tablename__ = "presence_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("class_sessions.session_id", ondelete="CASCADE"), nullable=False, index=True)
    scanned_at = Column(DateTime, nullable=False, server_default=func.now(), index=True)
    mssv = Column(String(20), nullable=False, index=True)
