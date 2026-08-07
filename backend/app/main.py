import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi import Request

# Đã bỏ api_schedules ở đây vì nó đã được gom vào api_router mới
from app.api.endpoints import api_timetable 

# Thêm đường dẫn gốc để import config
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.append(project_root)

from config.settings import settings
from app.db.session import engine, Base

# Import GỌN NHẸ: Chỉ cần import app.models là SQLAlchemy tự nhận diện đủ 11 bảng
import app.models 

# Tạo bảng (Nếu Database trống thì sẽ tự động tạo bảng)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Attendance API",
    description="API cho hệ thống điểm danh bằng khuôn mặt gjghjgjg",
    version="2.0.0"
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )
    
# Cấu hình CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount thư mục lưu ảnh tĩnh để Frontend hiển thị ảnh
images_dir = os.path.join(project_root, settings.database.get("images_dir", "./database/registered_images"))
os.makedirs(images_dir, exist_ok=True)
app.mount("/images", StaticFiles(directory=images_dir), name="images")

# Import các endpoints (Đã xóa api_credit_classes cũ)
from app.api.endpoints import (
    api_subject,
    api_admin_students,
    api_admin_lecturers,
    api_admin_classrooms,
    api_auth,
    api_ai,
    api_faculty,
    api_major
)

# 🟢 IMPORT API ROUTER TỔNG (Bao gồm 5 file vừa tách)
from app.api.endpoints.api_router import api_router as class_management_router

def include_optional_router(module, prefix: str, tags: list[str]):
    router = getattr(module, "router", None)
    if router is not None:
        app.include_router(router, prefix=prefix, tags=tags)

# Đăng ký các Router từ các file API
include_optional_router(api_auth, prefix="/api/auth", tags=["Xác thực"])
include_optional_router(api_ai, prefix="/api", tags=["AI & Nhận diện"])
include_optional_router(api_timetable, prefix="/api", tags=["Thời khóa biểu"])

# 🟢 ĐĂNG KÝ ROUTER TỔNG 
# Thêm prefix="/api" để các endpoint bên trong được map đúng (vd: /api/attendance)
app.include_router(class_management_router, prefix="/api")

# Các Router quản lý (Admin)
include_optional_router(api_subject, prefix="/api/subjects", tags=["Quản lý Môn học"])
include_optional_router(api_faculty, prefix="/api/faculties", tags=["Quản lý Khoa"])
include_optional_router(api_major, prefix="/api/majors", tags=["Quản lý Ngành"])
include_optional_router(api_admin_students, prefix="/api/admin/students", tags=["Admin - Quản lý Sinh viên"])
include_optional_router(api_admin_students, prefix="/api/students", tags=["Sinh viên (Alias)"])
include_optional_router(api_admin_lecturers, prefix="/api/admin/lecturers", tags=["Admin - Quản lý Giảng viên"])
include_optional_router(api_admin_classrooms, prefix="/api/admin/classrooms", tags=["Admin - Quản lý Phòng học"])

@app.get("/", response_class=HTMLResponse)
def read_root():
    template_path = os.path.join(project_root, "templates", "index.html")
    if os.path.exists(template_path):
        with open(template_path, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    return HTMLResponse(content="<h1>Khong tim thay tep giao dien templates/index.html</h1>", status_code=404)

if __name__ == "__main__":
    import uvicorn
    server_cfg = settings.server
    host = server_cfg.get("host", "127.0.0.1")
    port = server_cfg.get("port", 8000)
    
    print(f"\n========================================================")
    print(f"Khoi chay Web API Server tai: http://{host}:{port}")
    print(f"========================================================\n")
    
    uvicorn.run("app.main:app", host=host, port=port, reload=True)