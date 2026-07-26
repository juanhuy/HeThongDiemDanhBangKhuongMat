from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# Base schema chứa các trường chung
class StudentBase(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None # Sẽ map vào personal_email của user_profiles
    phone_number: Optional[str] = None
    administrative_class: Optional[str] = None
    major: Optional[str] = None
    cohort: Optional[str] = None
    training_program: Optional[str] = None
    academic_status: Optional[str] = "Đang học"

# Schema dùng khi tạo mới sinh viên (Bắt buộc có student_id)
class StudentCreate(StudentBase):
    student_id: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "student_id": "N22DCCN160",
                "full_name": "Phạm Văn Phú",
                "email": "N22DCCN160@student.ptit.edu.vn",
                "phone_number": "0123456789",
                "administrative_class": "D22CQCNMT01-N",
                "major": "Công nghệ thông tin",
                "cohort": "2022-2027",
                "training_program": "Đại học chính quy",
                "academic_status": "Đang học"
            }
        }

# Schema dùng khi update (Cho phép các trường bị bỏ trống)
class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    administrative_class: Optional[str] = None
    academic_status: Optional[str] = None

# Schema dữ liệu trả về cho Client
class StudentResponse(StudentBase):
    student_id: str
    account_id: Optional[int] = None
    profile_id: Optional[int] = None

    class Config:
        from_attributes = True

class PaginatedStudentResponse(BaseModel):
    total: int
    items: list[StudentResponse]