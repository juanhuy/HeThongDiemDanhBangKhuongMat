from pydantic import BaseModel, Field
from typing import Optional, List

# =========================================================================
# 1. SCHEMA DÙNG CHO NGHIỆP VỤ "TẠO LỚP TỰ ĐỘNG" (WIZARD)
# =========================================================================

class AutoGenerateRequest(BaseModel):
    subject_id: str = Field(..., description="Mã môn học")
    semester_id: str = Field(..., description="Mã học kỳ (VD: 2024_2025_1)")
    total_students: int = Field(..., description="Tổng số sinh viên dự kiến")
    max_theory_capacity: int = Field(100, description="Sức chứa phòng Lý thuyết")
    max_practice_capacity: int = Field(40, description="Sức chứa phòng máy/Thực hành")

class PracticeGroupDraft(BaseModel):
    class_group: str = Field(..., description="VD: Tổ 1, Tổ 2")
    max_students: int
    class_type: str = "Practice"

class TheoryGroupDraft(BaseModel):
    class_group: str = Field(..., description="VD: 01, 02")
    max_students: int
    class_type: str = "Theory"
    target_classes: List[str] = Field(default=[], description="Mảng chứa mã lớp HC (Lớp ghép)")
    sub_groups: List[PracticeGroupDraft] = [] 

class SaveDraftRequest(BaseModel):
    subject_id: str
    lecturer_id: Optional[str] = None
    semester_id: str
    groups: List[TheoryGroupDraft]


# =========================================================================
# 2. SCHEMA DÙNG CHO NGHIỆP VỤ CRUD CƠ BẢN (TẠO/SỬA LỚP ĐƠN)
# =========================================================================

class CreditClassBase(BaseModel):
    subject_id: str = Field(..., description="Mã môn học (VD: INT1339)")
    lecturer_id: Optional[str] = Field(None, description="Mã giảng viên (VD: GV2026001)")
    semester_id: str = Field(..., description="Mã học kỳ (VD: 2024_2025_1)")
    
    class_group: Optional[str] = Field(None, description="Tên Nhóm/Tổ (VD: 01 hoặc Tổ 1)")
    class_type: str = Field("Combined", description="Loại: Theory, Practice, Combined")
    start_week: Optional[int] = Field(None, description="Tuần bắt đầu")
    end_week: Optional[int] = Field(None, description="Tuần kết thúc")
    
    max_students: int = Field(50, gt=0, description="Sĩ số tối đa")
    status: str = Field("Active", description="Trạng thái lớp học")
    
    # Thay thế administrative_class_id cũ bằng mảng target_classes
    target_classes: List[str] = Field(default=[], description="Danh sách mã lớp hành chính ghép")

class CreditClassCreate(CreditClassBase):
    class_id: Optional[str] = None
    parent_class_id: Optional[str] = Field(None, description="ID Nhóm cha (Nếu lớp này là Tổ TH)")

class CreditClassUpdate(BaseModel):
    lecturer_id: Optional[str] = None
    semester_id: Optional[str] = None
    class_group: Optional[str] = None
    class_type: Optional[str] = None
    start_week: Optional[int] = None
    end_week: Optional[int] = None
    max_students: Optional[int] = Field(None, gt=0)
    status: Optional[str] = None
    target_classes: Optional[List[str]] = None


# =========================================================================
# 3. SCHEMA DÙNG ĐỂ TRẢ VỀ RESPONSE
# =========================================================================

class CreditClassResponse(BaseModel):
    """Schema dùng để định dạng dữ liệu trả về cho Frontend"""
    class_id: str
    parent_class_id: Optional[str]
    subject_id: str
    lecturer_id: Optional[str]
    semester_id: str
    
    class_group: Optional[str]
    class_type: str
    start_week: Optional[int]
    end_week: Optional[int]
    
    max_students: int
    current_students: int
    status: str
    
    # Trả về danh sách các lớp hành chính đang ghép
    target_classes: List[str] = []

    class Config:
        from_attributes = True