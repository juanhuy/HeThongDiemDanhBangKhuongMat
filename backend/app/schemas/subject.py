from pydantic import BaseModel

# Schema dữ liệu frontend gửi lên khi tạo môn học
class SubjectCreate(BaseModel):
    subject_id: str
    subject_name: str
    credits: int

# Schema dữ liệu trả về cho Frontend
class SubjectResponse(BaseModel):
    subject_id: str
    subject_name: str
    credits: int

    class Config:
        from_attributes = True # Cho phép Pydantic đọc từ SQLAlchemy Object