from sqlalchemy import Column, String, Integer, Date
from app.db.session import Base

class Semester(Base):
    __tablename__ = 'semesters'

    semester_id = Column(String(20), primary_key=True)
    academic_year = Column(String(20), nullable=False)
    semester_number = Column(Integer, nullable=False)
    
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    
    status = Column(String(20), default='Upcoming')
