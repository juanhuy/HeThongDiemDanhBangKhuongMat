from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class CreditClass(Base):
    __tablename__ = "credit_classes"

    class_id = Column(String(50), primary_key=True, index=True) # ma_lop_tc
    subject_id = Column(String(20), ForeignKey("subjects.subject_id", ondelete="CASCADE"), nullable=False) # ma_mon

    subject = relationship("Subject")
