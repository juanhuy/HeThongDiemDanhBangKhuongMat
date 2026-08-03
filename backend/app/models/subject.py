from sqlalchemy import Column, String, Integer, Boolean, Computed
from sqlalchemy.orm import relationship
from app.db.session import Base

class Subject(Base):
    __tablename__ = 'subjects'

    subject_id = Column(String(20), primary_key=True)
    subject_name = Column(String(150), nullable=False)
    theory_credits = Column(Integer, default=0)
    practical_credits = Column(Integer, default=0)
    credits = Column(Integer, default=0)
    
    theory_periods = Column(Integer, Computed("theory_credits * 15"))
    practical_periods = Column(Integer, Computed("practical_credits * 45"))
    total_periods = Column(Integer, Computed("(theory_credits * 15) + (practical_credits * 45)"))

    department = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)

    classes = relationship("CreditClass", back_populates="subject")