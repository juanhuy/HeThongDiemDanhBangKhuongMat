from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base

class Account(Base):
    __tablename__ = 'accounts'

    account_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False) # 'admin', 'lecturer', 'student'
    is_active = Column(Boolean, default=True)
    failed_login_attempts = Column(Integer, default=0)
    lock_until = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    refresh_token = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    profile = relationship("UserProfile", back_populates="account", uselist=False, cascade="all, delete-orphan")