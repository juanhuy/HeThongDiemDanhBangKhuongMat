from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

class ClassSessionBase(BaseModel):
    class_id: str
    room_id: str
    session_date: date
    shift: int
    start_time: datetime
    end_time: datetime
    session_type: str = "Theory" # Theory, Practice, Exam
    status: str = "Scheduled"    # Scheduled, In_Progress, Completed, Cancelled
    notes: Optional[str] = None

class ClassSessionCreate(ClassSessionBase):
    pass

class ClassSessionUpdate(BaseModel):
    room_id: Optional[str] = None
    session_date: Optional[date] = None
    shift: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    session_type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class ClassSessionResponse(ClassSessionBase):
    session_id: int

    class Config:
        from_attributes = True