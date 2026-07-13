from fastapi import FastAPI
from app.api.endpoints import api_subject 
# from app.api.endpoints import api_students 
from app.api.endpoints import api_admin_students, api_admin_lecturers, api_admin_faces


from app.db.session import engine, Base

# Import các model để SQLAlchemy nhận diện được cấu trúc bảng
from app.models.account import Account
from app.models.student import Student
from app.models.subject import Subject 
from app.models.lecturer import Lecturer
from app.models.face_feature import FaceFeature

# Tạo bảng (Nếu dùng Alembic thì bỏ dòng này, nhưng để test nhanh thì dùng)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Attendance API",
    description="API cho hệ thống điểm danh bằng khuôn mặt",
    version="1.0.0"
)

# Đăng ký các Router từ các file api_
app.include_router(api_subject.router, prefix="/api/subjects", tags=["Quản lý Môn học"])
# app.include_router(api_students.router, prefix="/api/students", tags=["Quản lý Sinh viên"])
# Khai báo Router chuẩn của Admin
app.include_router(api_admin_students.router, prefix="/api/admin/students", tags=["Admin - Quản lý Sinh viên"])
app.include_router(api_admin_lecturers.router, prefix="/api/admin/lecturers", tags=["Admin - Quản lý Giảng viên"])
# Đăng ký nhóm API Khuôn mặt với prefix riêng
app.include_router(
    api_admin_faces.router, 
    prefix="/api/admin/faces", 
    tags=["Admin - Quản lý Dữ liệu khuôn mặt"]
)