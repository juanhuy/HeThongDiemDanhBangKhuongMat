from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SubjectBase(BaseModel):
    subject_id: str = Field(..., example="IT101")
    subject_name: str = Field(..., example="Cấu trúc dữ liệu và giải thuật")
    credits: Optional[int] = Field(default=None, example=3)
    theory_credits: int = Field(default=0, example=2) # Đổi thành tín chỉ lý thuyết
    practical_credits: int = Field(default=0, example=1) # Đổi thành tín chỉ thực hành
    semester: Optional[int] = None
    prerequisites: Optional[str] = None
    faculty_id: Optional[str] = None
    is_active: bool = True

class SubjectCreate(SubjectBase):
    pass

class SubjectUpdate(BaseModel):
    subject_name: Optional[str] = None
    credits: Optional[int] = None
    theory_credits: Optional[int] = None
    practical_credits: Optional[int] = None
    semester: Optional[int] = None
    prerequisites: Optional[str] = None
    faculty_id: Optional[str] = None
    is_active: Optional[bool] = None

class FacultyInfo(BaseModel):
    faculty_id: str
    faculty_name: str
    
    class Config:
        from_attributes = True

class SubjectResponse(BaseModel):
    subject_id: str
    subject_name: str
    theory_credits: int
    practical_credits: int
    credits: Optional[int] = 0
    semester: Optional[int] = None
    prerequisites: Optional[str] = None
    faculty_id: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    # fix API trả về json có thêm tên Khoa
    faculty: Optional[FacultyInfo] = None 

    class Config:
        from_attributes = True

class PaginatedSubjectResponse(BaseModel):
    total: int
    items: list[SubjectResponse]
