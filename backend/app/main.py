import os
import sys
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

# Thêm đường dẫn gốc để import config
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.append(project_root)

from config.settings import settings
from app.db.session import engine, Base
from app.core.require import require_admin, get_current_user

# Import các model để SQLAlchemy nhận diện được cấu trúc bảng (trigger reload 1)
from app.models.account import Account
from app.models.student import Student
from app.models.subject import Subject 
from app.models.lecturer import Lecturer
from app.models.face_feature import FaceFeature
from app.models.credit_class import CreditClass
from app.models.student_class import StudentClassEnrollment
from app.models.class_schedule import ClassSchedule
from app.models.attendance_history import AttendanceHistory
from app.models.leave_request import LeaveRequest
from app.models.system_setting import SystemSetting
from app.models.audit_log import AuditLog
from app.models.notification import Notification

# Tạo bảng (Nếu dùng Alembic thì bỏ dòng này, nhưng để test nhanh thì dùng)
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

# Backfill: đồng bộ current_students theo số sinh viên đang đăng ký thực tế
try:
    with engine.begin() as conn:
        conn.execute(text(
            "UPDATE credit_classes c SET current_students = "
            "(SELECT COUNT(*) FROM student_class_enrollment s WHERE s.class_id = c.class_id)"
        ))
except Exception as e:
    print(f">>> DATABASE BACKFILL ERROR: {e}")

# Tự động thêm cột thời gian (created_at/updated_at) nếu còn thiếu — cho môi trường khác
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
    version="1.0.0"
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

# Thư mục lưu ảnh khuôn mặt (KHÔNG mount công khai; phục vụ qua endpoint có auth)
images_dir = os.path.join(project_root, settings.database.get("images_dir", "./database/registered_images"))
os.makedirs(images_dir, exist_ok=True)

# Import các endpoints
from app.api.endpoints import (
    api_subject,
    api_admin_students,
    api_admin_lecturers,
    api_admin_faces,
    api_auth,
    api_credit_classes,
    api_ai,
    api_demo
)

# Đăng ký các Router từ các file api_
app.include_router(api_auth.router, prefix="/api/auth", tags=["Xác thực"])
app.include_router(api_credit_classes.router, prefix="/api", tags=["Lớp học & Điểm danh"])
app.include_router(api_ai.router, prefix="/api", dependencies=[Depends(get_current_user)], tags=["AI & Nhận diện"])

# Các Router quản trị (chỉ Admin mới được truy cập)
app.include_router(api_subject.router, prefix="/api/subjects", tags=["Quản lý Môn học"])
app.include_router(api_admin_students.router, prefix="/api/admin/students", dependencies=[Depends(require_admin)], tags=["Admin - Quản lý Sinh viên"])
app.include_router(api_admin_lecturers.router, prefix="/api/admin/lecturers", dependencies=[Depends(require_admin)], tags=["Admin - Quản lý Giảng viên"])
app.include_router(api_admin_faces.router, prefix="/api/admin/faces", dependencies=[Depends(require_admin)], tags=["Admin - Quản lý Dữ liệu khuôn mặt"])
app.include_router(api_demo.router, prefix="/api/admin/demo", dependencies=[Depends(require_admin)], tags=["Admin - Bảng điều khiển Demo"])

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
