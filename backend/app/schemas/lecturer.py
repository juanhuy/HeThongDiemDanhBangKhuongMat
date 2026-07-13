from pydantic import BaseModel, EmailStr
from typing import Optional

class LecturerBase(BaseModel):
    full_name: str
    email: EmailStr
    phone_number: Optional[str] = None
    department: Optional[str] = None

class LecturerCreate(LecturerBase):
    lecturer_id: str

class LecturerUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None  # To block/unblock account

class LecturerResponse(LecturerBase):
    lecturer_id: str
    account_id: Optional[int] = None
    is_active: Optional[bool] = None

    class Config:
        from_attributes = True

class PaginatedLecturerResponse(BaseModel):
    total: int
    items: list[LecturerResponse]
