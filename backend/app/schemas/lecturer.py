from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date

class LecturerBase(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    citizen_id: Optional[str] = None
    ethnicity: Optional[str] = None
    religion: Optional[str] = None
    nationality: Optional[str] = "Việt Nam"
    address: Optional[str] = None
    place_of_birth: Optional[str] = None
    
    faculty_id: Optional[str] = None
    academic_title: Optional[str] = None # VD: ThS, TS
    position: Optional[str] = "Giảng viên"       # VD: Trưởng bộ môn
    employment_type: Optional[str] = None# VD: Cơ hữu, Thỉnh giảng
    teaching_status: Optional[str] = 'Active'

class LecturerCreate(LecturerBase):
    lecturer_id: Optional[str] = None

class LecturerUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    citizen_id: Optional[str] = None
    ethnicity: Optional[str] = None
    religion: Optional[str] = None
    nationality: Optional[str] = None
    address: Optional[str] = None
    place_of_birth: Optional[str] = None
    faculty_id: Optional[str] = None
    academic_title: Optional[str] = None
    position: Optional[str] = None
    employment_type: Optional[str] = None
    teaching_status: Optional[str] = None
    is_active: Optional[bool] = None

class LecturerResponse(LecturerBase):
    lecturer_id: str
    profile_id: Optional[int] = None
    hire_date: Optional[date] = None

    class Config:
        from_attributes = True

class PaginatedLecturerResponse(BaseModel):
    total: int
    items: list[LecturerResponse]