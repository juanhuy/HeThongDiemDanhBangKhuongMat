from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AttendanceResponse(BaseModel):
    record_id: int
    session_id: int
    student_id: str
    status: str
    recorded_at: Optional[datetime] = None
    confidence_score: Optional[float] = None
    proof_image_url: Optional[str] = None

    class Config:
        from_attributes = True