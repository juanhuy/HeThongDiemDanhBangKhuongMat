import os
import sys
from fastapi import FastAPI, Depends
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
from app.core.require import require_admin, get_current_user

# Import GỌN NHẸ: Chỉ cần import app.models là SQLAlchemy tự nhận diện đủ các bảng
import app.models 

# Tạo bảng (Nếu Database trống thì sẽ tự động tạo bảng)
Base.metadata.create_all(bind=engine)

# Tự động cập nhật cấu trúc cơ sở dữ liệu nếu cột lecturer_id chưa tồn tại
from sqlalchemy import text
try:
    with engine.begin() as conn:
        res = conn.execute(text("SHOW COLUMNS FROM credit_classes LIKE 'lecturer_id'"))
        if not res.fetchone():
            print(">>> DATABASE UPDATE: Adding lecturer_id column to credit_classes table...")
            conn.execute(text("ALTER TABLE credit_classes ADD COLUMN lecturer_id VARCHAR(20) NULL"))
            conn.execute(text("ALTER TABLE credit_classes ADD CONSTRAINT fk_credit_classes_lecturers FOREIGN KEY (lecturer_id) REFERENCES lecturers(lecturer_id) ON DELETE SET NULL"))
except Exception as e:
    print(f">>> DATABASE UPDATE ERROR: {e}")

# Tự động thêm các cột mới phục vụ chuẩn hóa đăng ký học phần (an toàn nếu cột đã tồn tại)
_db_alter_statements = [
    ("subjects", "semester", "semester INT NULL", "semester INT"),
    ("subjects", "prerequisites", "prerequisites VARCHAR(255) NULL", "prerequisites VARCHAR(255)"),
    ("credit_classes", "semester", "semester INT NULL", "semester INT"),
    ("credit_classes", "academic_year", "academic_year VARCHAR(20) NULL", "academic_year VARCHAR(20)"),
    ("credit_classes", "cohort", "cohort VARCHAR(20) NULL", "cohort VARCHAR(20)"),
    ("credit_classes", "max_students", "max_students INT DEFAULT 50", "max_students INT DEFAULT 50"),
    ("credit_classes", "current_students", "current_students INT DEFAULT 0", "current_students INT DEFAULT 0"),
    ("credit_classes", "status", "status VARCHAR(20) DEFAULT 'Active'", "status VARCHAR(20) DEFAULT 'Active'"),
]
try:
    with engine.begin() as conn:
        for table, column, _mysql, _sqlite in _db_alter_statements:
            try:
                res = conn.execute(text(f"SHOW COLUMNS FROM {table} LIKE '{column}'"))
                if not res.fetchone():
                    print(f">>> DATABASE UPDATE: Adding column {table}.{column}...")
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {_mysql}"))
            except Exception as col_err:
                print(f">>> DATABASE UPDATE ERROR ({table}.{column}): {col_err}")
except Exception as e:
    print(f">>> DATABASE UPDATE ERROR: {e}")

# Tự động thêm cột thời gian (created_at/updated_at) nếu còn thiếu
_timestamp_columns = [
    ("accounts", "updated_at", "DATETIME NULL"),
    ("students", "created_at", "DATETIME NULL"),
    ("students", "updated_at", "DATETIME NULL"),
    ("credit_classes", "created_at", "DATETIME NULL"),
    ("credit_classes", "updated_at", "DATETIME NULL"),
]
try:
    with engine.begin() as conn:
        for table, column, ddl in _timestamp_columns:
            try:
                res = conn.execute(text(f"SHOW COLUMNS FROM {table} LIKE '{column}'"))
                if not res.fetchone():
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
                    conn.execute(text(f"UPDATE {table} SET {column}=NOW() WHERE {column} IS NULL"))
            except Exception as col_err:
                print(f">>> DATABASE UPDATE ERROR ({table}.{column}): {col_err}")
except Exception as e:
    print(f">>> DATABASE UPDATE ERROR (timestamps): {e}")

app = FastAPI(
    title="AI Attendance API",
    description="API cho hệ thống điểm danh bằng khuôn mặt",
    version="2.0.0"
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
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

# Thư mục lưu ảnh khuôn mặt
images_dir = os.path.join(project_root, settings.database.get("images_dir", "./database/registered_images"))
os.makedirs(images_dir, exist_ok=True)

# Import các endpoints
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

try:
    from app.api.endpoints import api_credit_classes
except ImportError:
    api_credit_classes = None

try:
    from app.api.endpoints import api_demo
except ImportError:
    api_demo = None

# Import API Router tổng (bao gồm các router phân tách mới)
try:
    from app.api.endpoints.api_router import api_router as class_management_router
except ImportError:
    class_management_router = None

def include_optional_router(module, prefix: str, tags: list[str], dependencies=None):
    if module is None:
        return
    router = getattr(module, "router", None) if not hasattr(module, "routes") else module
    if router is not None:
        kwargs = {"prefix": prefix, "tags": tags}
        if dependencies:
            kwargs["dependencies"] = dependencies
        app.include_router(router, **kwargs)

# Đăng ký các Router từ các file API
include_optional_router(api_auth, prefix="/api/auth", tags=["Xác thực"])
include_optional_router(api_ai, prefix="/api", tags=["AI & Nhận diện"])
include_optional_router(api_timetable, prefix="/api", tags=["Thời khóa biểu"])

if class_management_router is not None:
    app.include_router(class_management_router, prefix="/api")

if api_credit_classes is not None:
    include_optional_router(api_credit_classes, prefix="/api", tags=["Lớp học & Điểm danh"])

# Các Router quản lý (Admin)
include_optional_router(api_subject, prefix="/api/subjects", tags=["Quản lý Môn học"])
include_optional_router(api_faculty, prefix="/api/faculties", tags=["Quản lý Khoa"])
include_optional_router(api_major, prefix="/api/majors", tags=["Quản lý Ngành"])
include_optional_router(api_admin_students, prefix="/api/admin/students", tags=["Admin - Quản lý Sinh viên"])
include_optional_router(api_admin_students, prefix="/api/students", tags=["Sinh viên (Alias)"])
include_optional_router(api_admin_lecturers, prefix="/api/admin/lecturers", tags=["Admin - Quản lý Giảng viên"])
include_optional_router(api_admin_classrooms, prefix="/api/admin/classrooms", tags=["Admin - Quản lý Phòng học"])
if api_demo is not None:
    include_optional_router(api_demo, prefix="/api/admin/demo", tags=["Admin - Bảng điều khiển Demo"])

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