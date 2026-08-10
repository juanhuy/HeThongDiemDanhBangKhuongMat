from sqlalchemy import Column, Integer, String, Text, DateTime, Index
from sqlalchemy.sql import func
from app.db.session import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_created", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    actor_username = Column(String(100), nullable=True)
    actor_role = Column(String(20), nullable=True)
    action = Column(String(50), nullable=False)          # CREATE / UPDATE / DELETE / LOGIN / ...
    target = Column(String(50), nullable=True)           # students / lecturers / subjects / ...
    target_id = Column(String(100), nullable=True)       # mã đối tượng bị thao tác
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
