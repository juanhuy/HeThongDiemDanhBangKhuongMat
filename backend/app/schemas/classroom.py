from pydantic import BaseModel, Field
from typing import Optional
from typing import List, Dict, Any

class ImportResponse(BaseModel):
    total_processed: int
    success_count: int
    error_count: int
    errors: List[Dict[str, Any]] = [] # Lưu danh sách các dòng lỗi và lý do
    
class ClassroomBase(BaseModel):
    campus: str = Field(..., example="CS Tăng Nhơn Phú")
    building: str = Field(..., example="A")
    room_number: str = Field(..., example="101")
    room_name: Optional[str] = None  # Sẽ tự sinh
    
    notes: Optional[str] = None
    camera_rtsp_url: Optional[str] = None
    camera_status: Optional[str] = 'Online'
    capacity: Optional[int] = 50
    room_type: Optional[str] = 'Theory'
    status: Optional[str] = 'Active'

class ClassroomCreate(ClassroomBase):
    room_id: Optional[str] = None

class ClassroomUpdate(BaseModel):
    campus: Optional[str] = None
    building: Optional[str] = None
    room_number: Optional[str] = None
    notes: Optional[str] = None
    camera_rtsp_url: Optional[str] = None
    camera_status: Optional[str] = None
    capacity: Optional[int] = None
    room_type: Optional[str] = None
    status: Optional[str] = None

class ClassroomResponse(ClassroomBase):
    room_id: str
    room_name: str
    scheduled_classes: list[str] = []
    is_occupied: bool = False

    class Config:
        from_attributes = True
