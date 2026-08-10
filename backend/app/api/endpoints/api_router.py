from fastapi import APIRouter

# Sử dụng dấu chấm (.) để import các file cùng thư mục
from . import credit_classes, enrollments, schedules, attendance, categories

api_router = APIRouter()

# Gom nhóm và chia danh mục trong tài liệu Swagger (docs)
api_router.include_router(
    credit_classes.router, 
    prefix="", 
    tags=["1. Quản lý Lớp Tín Chỉ"]
)

api_router.include_router(
    enrollments.router, 
    prefix="", 
    tags=["2. Đăng ký Môn Học"]
)

api_router.include_router(
    schedules.router, 
    prefix="", 
    tags=["3. Thời Khóa Biểu & Phòng Học"]
)

api_router.include_router(
    attendance.router, 
    prefix="", 
    tags=["4. Quản lý Điểm Danh"]
)

api_router.include_router(
    categories.router, 
    prefix="", 
    tags=["5. Dữ liệu Danh Mục"]
)