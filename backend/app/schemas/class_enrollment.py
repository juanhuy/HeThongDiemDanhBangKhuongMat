from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ClassEnrollmentBase(BaseModel):
    class_id: str
    student_id: str

class ClassEnrollmentCreate(ClassEnrollmentBase):
    pass

class ClassEnrollmentResponse(ClassEnrollmentBase):
    enrollment_date: datetime
    status: str
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True