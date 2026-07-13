from pydantic import BaseModel, Field
from typing import Optional


class SubjectBase(BaseModel):
    subject_id: str = Field(..., example="IT101")
    subject_name: str = Field(..., example="Cấu trúc dữ liệu và giải thuật")
    credits: int = Field(..., example=3)
    is_active: bool = True

class SubjectCreate(SubjectBase):
    pass

# Schema dữ liệu trả về cho Frontend
class SubjectResponse(BaseModel):
    subject_id: str
    subject_name: str
    credits: int
    

    class Config:
        from_attributes = True # Cho phép Pydantic đọc từ SQLAlchemy Object

class SubjectUpdate(BaseModel):
    subject_name: Optional[str] = None
    credits: Optional[int] = None
    is_active: Optional[bool] = None