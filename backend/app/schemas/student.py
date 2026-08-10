from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date

class StudentBase(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None # Sẽ map vào personal_email của user_profiles
    phone_number: Optional[str] = None
    
    administrative_class: Optional[str] = None
    major_id: Optional[str] = None
    specialization: Optional[str] = None # Mới thêm
    faculty_id: Optional[str] = None     # Mới thêm
    cohort: Optional[str] = None
    training_program: Optional[str] = None
    academic_status: Optional[str] = "Đang học"
    
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    citizen_id: Optional[str] = None
    ethnicity: Optional[str] = None
    religion: Optional[str] = None
    nationality: Optional[str] = "Việt Nam"
    place_of_birth: Optional[str] = None
    address: Optional[str] = None

class StudentCreate(StudentBase):
    student_id: str

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    administrative_class: Optional[str] = None
    specialization: Optional[str] = None
    academic_status: Optional[str] = None
    address: Optional[str] = None

class StudentResponse(StudentBase):
    student_id: str
    profile_id: Optional[int] = None

    class Config:
        from_attributes = True

class PaginatedStudentResponse(BaseModel):
    total: int
    items: list[StudentResponse]