from pydantic import BaseModel, Field
from typing import Optional

class SubjectBase(BaseModel):
    subject_id: str = Field(..., example="IT101")
    subject_name: str = Field(..., example="Cấu trúc dữ liệu và giải thuật")
    theory_credits: int = Field(default=0, example=2) # Đổi thành tín chỉ lý thuyết
    practical_credits: int = Field(default=0, example=1) # Đổi thành tín chỉ thực hành
    faculty_id: Optional[str] = None
    is_active: bool = True

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    subject_name: Optional[str] = None
    theory_credits: Optional[int] = None
    practical_credits: Optional[int] = None
    faculty_id: Optional[str] = None
    is_active: Optional[bool] = None

class SubjectResponse(SubjectBase):
    credits: int # Tổng tín chỉ (từ DB sinh ra)

    class Config:
        from_attributes = True 

class PaginatedSubjectResponse(BaseModel):
    total: int
    items: list[SubjectResponse]