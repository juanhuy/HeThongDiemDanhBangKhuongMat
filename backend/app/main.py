from fastapi import FastAPI
from app.api.endpoints import api_subject, api_students 
from app.db.session import engine, Base

# BỔ SUNG QUAN TRỌNG: Import các model để SQLAlchemy nhận diện được cấu trúc bảng
from app.models.account import Account
from app.models.student import Student
# from app.models.subject import Subject (nếu bạn đã tạo model môn học)

# Tạo bảng (Nếu dùng Alembic thì bỏ dòng này, nhưng để test nhanh thì dùng)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Attendance API",
    description="API cho hệ thống điểm danh bằng khuôn mặt",
    version="1.0.0"
)

# Đăng ký các Router từ các file api_
app.include_router(api_subject.router, prefix="/api/subjects", tags=["Quản lý Môn học"])
app.include_router(api_students.router, prefix="/api/students", tags=["Quản lý Sinh viên"])