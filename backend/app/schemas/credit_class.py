from pydantic import BaseModel, Field
from typing import Optional

class CreditClassBase(BaseModel):
    subject_id: str = Field(..., description="Mã môn học (VD: INT1339)")
    lecturer_id: str = Field(..., description="Mã giảng viên")
    administrative_class_id: Optional[str] = Field(None, description="Mã lớp biên chế (VD: D20CQCN01)")
    semester: int = Field(..., ge=1, le=4, description="Học kỳ (1, 2, 3, 4 - Hè)")
    academic_year: str = Field(..., description="Niên khóa (VD: 2024-2025)")
    class_group: Optional[str] = Field(None, description="Nhóm/Tổ (VD: TH1)")
    max_students: int = Field(50, gt=0, description="Sĩ số tối đa")
    status: str = Field("Active", description="Trạng thái lớp học")

class CreditClassCreate(CreditClassBase):
    class_id: Optional[str] = None

class CreditClassUpdate(BaseModel):
    lecturer_id: Optional[str] = Field(None, description="Mã giảng viên thay thế")
    administrative_class_id: Optional[str] = Field(None, description="Mã lớp biên chế mới")
    class_group: Optional[str] = Field(None, description="Nhóm/Tổ thực hành mới")
    max_students: Optional[int] = Field(None, gt=0, description="Cập nhật sĩ số tối đa")
    semester: Optional[int] = Field(None, description="Học kỳ")
    academic_year: Optional[str] = Field(None, description="Niên khóa")
    status: Optional[str] = Field(None, description="Trạng thái (Planning, Active, Completed, Cancelled)")

class CreditClassResponse(BaseModel):
    """Schema dùng để định dạng dữ liệu trả về cho chuẩn hóa"""
    class_id: str
    subject_id: str
    lecturer_id: str
    administrative_class_id: Optional[str]
    semester: int
    academic_year: str
    class_group: Optional[str]
    max_students: int
    current_students: int
    status: str

    class Config:
        from_attributes = True  # Cho phép parse trực tiếp từ SQLAlchemy Model