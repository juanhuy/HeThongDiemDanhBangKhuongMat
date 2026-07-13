from pydantic import BaseModel, Field
from typing import Optional


class SubjectBase(BaseModel):
    subject_code: str = Field(..., example="IT101")
    subject_name: str = Field(..., example="Cấu trúc dữ liệu và giải thuật")
    credits: int = Field(..., example=3)

class SubjectCreate(SubjectBase):
    pass

# Schema dữ liệu trả về cho Frontend
class SubjectResponse(BaseModel):
    subject_id: str
    subject_name: str
    credits: int

    class Config:
        from_attributes = True # Cho phép Pydantic đọc từ SQLAlchemy Object