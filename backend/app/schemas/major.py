from pydantic import BaseModel
from typing import Optional

class MajorBase(BaseModel):
    major_name: str
    faculty_id: str
    degree_level: Optional[str] = "Bachelors"

class MajorCreate(MajorBase):
    major_id: str

class MajorUpdate(BaseModel):
    major_name: Optional[str] = None
    faculty_id: Optional[str] = None
    degree_level: Optional[str] = None

class MajorResponse(MajorBase):
    major_id: str

    class Config:
        from_attributes = True

class PaginatedMajorResponse(BaseModel):
    total: int
    items: list[MajorResponse]
