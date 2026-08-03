from pydantic import BaseModel
from typing import Optional

class ClassroomBase(BaseModel):
    room_name: str
    building: Optional[str] = None
    notes: Optional[str] = None
    camera_rtsp_url: Optional[str] = None
    camera_status: str = 'Online'
    capacity: int = 50
    room_type: str = 'Theory'
    status: str = 'Active'

class ClassroomCreate(ClassroomBase):
    room_id: Optional[str] = None

class ClassroomUpdate(BaseModel):
    room_name: Optional[str] = None
    building: Optional[str] = None
    notes: Optional[str] = None
    camera_rtsp_url: Optional[str] = None
    camera_status: Optional[str] = None
    capacity: Optional[int] = None
    room_type: Optional[str] = None
    status: Optional[str] = None

class ClassroomResponse(ClassroomBase):
    room_id: str
    is_occupied: Optional[bool] = False
    scheduled_classes: Optional[list[str]] = []

    class Config:
        from_attributes = True