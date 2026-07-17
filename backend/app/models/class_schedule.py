from sqlalchemy import Column, Integer, String, Date, Time, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class ClassSchedule(Base):
    __tablename__ = "class_schedules"

    schedule_id = Column(Integer, primary_key=True, index=True, autoincrement=True) # ma_buoi_hoc
    class_id = Column(String(50), ForeignKey("credit_classes.class_id", ondelete="CASCADE"), nullable=False) # ma_lop_tc
    study_date = Column(Date, nullable=False) # ngay_hoc
    room = Column(String(20), nullable=False) # phong_hoc
    start_time = Column(Time, nullable=False) # gio_bat_dau

    credit_class = relationship("CreditClass")
