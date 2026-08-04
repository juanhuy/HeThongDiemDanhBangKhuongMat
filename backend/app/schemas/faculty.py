from pydantic import BaseModel
from typing import Optional

class FacultyBase(BaseModel):
    faculty_name: str
    dean_id: Optional[str] = None
    office_room: Optional[str] = None
    phone_number: Optional[str] = None
    status: Optional[str] = "Active"

class FacultyCreate(FacultyBase):
    faculty_id: str

class FacultyUpdate(BaseModel):
    faculty_name: Optional[str] = None
    dean_id: Optional[str] = None
    office_room: Optional[str] = None
    phone_number: Optional[str] = None
    status: Optional[str] = None

class FacultyResponse(FacultyBase):
    faculty_id: str

    class Config:
        from_attributes = True

class PaginatedFacultyResponse(BaseModel):
    total: int
    items: list[FacultyResponse]
