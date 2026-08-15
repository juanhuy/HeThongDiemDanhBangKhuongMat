"""Đồng bộ schema DB với model sau khi merge (idempotent).

Tự động thêm các cột thiếu (theo app.models) vào các bảng đã tồn tại,
để cả 2 nhánh tính năng (main + phu) đều chạy được. Không xóa/đổi cột có sẵn.

Chạy standalone:
    PYTHONPATH=<project_root> python backend/sync_schema.py

Hoặc được gọi tự động khi khởi động backend (app.main).
"""
import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from sqlalchemy import create_engine, text, inspect

# Nạp toàn bộ model để metadata đầy đủ
import app.models  # noqa: F401
from config.settings import settings

# Các cột cần thêm: (table, column, ddl_definition)
_ADD_COLUMNS = [
    # Bảo mật đăng nhập (main)
    ("accounts", "failed_login_attempts", "INT DEFAULT 0"),
    ("accounts", "lock_until", "DATETIME NULL"),

    # Hồ sơ người dùng
    ("user_profiles", "date_of_birth", "DATE NULL"),
    ("user_profiles", "place_of_birth", "VARCHAR(100) NULL"),

    # Sinh viên (FK chuẩn hóa từ nhánh phu)
    ("students", "administrative_class_id", "VARCHAR(50) NULL"),
    ("students", "faculty_id", "VARCHAR(20) NULL"),
    ("students", "major_id", "VARCHAR(20) NULL"),

    # Giảng viên (mở rộng hồ sơ từ nhánh phu)
    ("lecturers", "profile_id", "INT NULL"),
    ("lecturers", "faculty_id", "VARCHAR(20) NULL"),
    ("lecturers", "academic_title", "VARCHAR(50) NULL"),
    ("lecturers", "position", "VARCHAR(100) NULL"),
    ("lecturers", "employment_type", "VARCHAR(50) NULL"),
    ("lecturers", "teaching_status", "VARCHAR(50) DEFAULT 'Active'"),
    ("lecturers", "hire_date", "DATE NULL"),

    # Môn học (tín chỉ chi tiết từ nhánh main)
    ("subjects", "theory_credits", "INT DEFAULT 0"),
    ("subjects", "practical_credits", "INT DEFAULT 0"),
    ("subjects", "theory_periods", "INT DEFAULT 0"),
    ("subjects", "practical_periods", "INT DEFAULT 0"),
    ("subjects", "total_periods", "INT DEFAULT 0"),
    ("subjects", "faculty_id", "VARCHAR(20) NULL"),
    ("subjects", "created_at", "DATETIME NULL"),
    ("subjects", "updated_at", "DATETIME NULL"),

    # Lớp tín chỉ (thuộc tính nhóm/tổ/tuần từ nhánh phu)
    ("credit_classes", "parent_class_id", "VARCHAR(50) NULL"),
    ("credit_classes", "semester_id", "VARCHAR(20) NULL"),
    ("credit_classes", "group_number", "INT DEFAULT 1"),
    ("credit_classes", "sub_group_number", "INT NULL"),
    ("credit_classes", "class_type", "VARCHAR(20) DEFAULT 'Combined'"),
    ("credit_classes", "start_week", "INT NULL"),
    ("credit_classes", "end_week", "INT NULL"),

    # Lịch học (xếp lịch theo tiết từ nhánh phu; cột cũ study_date/room/start_time đã có)
    ("class_schedules", "room_id", "VARCHAR(20) NULL"),
    ("class_schedules", "day_of_week", "INT NULL"),
    ("class_schedules", "start_shift", "INT NULL"),
    ("class_schedules", "end_shift", "INT NULL"),

    # Nhận diện khuôn mặt (model_version)
    ("face_features", "model_version", "VARCHAR(50) DEFAULT 'buffalo_l'"),

    # Hệ thống tài liệu (flashcard theo chương)
    ("flashcards", "chapter", "VARCHAR(200) NULL"),
    ("flashcards", "card_type", "VARCHAR(20) DEFAULT 'fill-blank'"),
    ("documents", "analysis_json", "TEXT NULL"),
    ("documents", "analysis_status", "VARCHAR(20) DEFAULT 'pending'"),
    ("documents", "analysis_error", "VARCHAR(255) NULL"),
    ("documents", "moderation_verdict", "VARCHAR(20) NULL"),
    ("documents", "moderation_reason", "VARCHAR(500) NULL"),
    ("documents", "moderation_risk", "VARCHAR(10) NULL"),
    ("documents", "moderation_categories", "TEXT NULL"),

    # Điểm danh check-in / check-out (AI)
    ("attendance_records", "check_out_time", "DATETIME NULL"),
    ("attendance_records", "last_seen", "DATETIME NULL"),
    # Phân loại nguồn điểm danh: AI (camera) / manual (giảng viên)
    ("attendance_records", "source", "VARCHAR(20) DEFAULT 'AI'"),

    # Xin nghỉ phép hỗ trợ buổi học mới (class_sessions) bên cạnh lịch cũ (class_schedules)
    ("leave_requests", "session_id", "INT NULL"),

    # Đăng ký học phần: môn học trước / song hành + nợ học phí SV
    ("subjects", "predecessors", "VARCHAR(255) NULL"),
    ("subjects", "corequisites", "VARCHAR(255) NULL"),
    ("students", "tuition_debt", "INT DEFAULT 0"),

    # Chương trình đào tạo (CTĐT): ngành + loại môn
    ("subjects", "major_ids", "VARCHAR(255) NULL"),
    ("subjects", "subject_type", "VARCHAR(20) DEFAULT 'Bắt buộc'"),
]

# Các cột cần đổi định nghĩa (ALTER ... MODIFY) để tương thích model
_MODIFY_COLUMNS = [
    # credits không còn là GENERATED; cho phép NULL + default để insert qua ORM
    ("subjects", "credits", "INT NULL DEFAULT 0"),
    # lecturers: cột cũ full_name/email đã chuyển sang user_profiles (profile_id);
    # để NULL để không chặn INSERT qua model mới (không có default ở DB cũ)
    ("lecturers", "full_name", "VARCHAR(50) NULL"),
    ("lecturers", "email", "VARCHAR(50) NULL"),
    # documents: văn bản trích xuất từ PDF có thể rất lớn -> nâng từ TEXT (64KB) lên LONGTEXT
    ("documents", "content_text", "LONGTEXT"),
    ("documents", "analysis_json", "LONGTEXT"),
    ("documents", "summary", "LONGTEXT"),
    ("documents", "key_points", "LONGTEXT"),
    # leave_requests: cho phép đơn nghỉ dựa trên class_sessions (schedule_id có thể NULL)
    ("leave_requests", "schedule_id", "INT NULL"),
]


def sync_database_schema(engine):
    """Thêm các cột còn thiếu vào DB. An toàn khi chạy nhiều lần."""
    added = []
    modified = []
    errors = []

    inspector = inspect(engine)

    with engine.begin() as conn:
        for table, column, ddl in _ADD_COLUMNS:
            try:
                existing = {c["name"] for c in inspector.get_columns(table)}
            except Exception as exc:
                errors.append(f"{table}: {exc}")
                continue
            if column in existing:
                continue
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
                added.append(f"{table}.{column}")
            except Exception as exc:
                errors.append(f"{table}.{column}: {exc}")

    with engine.begin() as conn:
        for table, column, ddl in _MODIFY_COLUMNS:
            try:
                conn.execute(text(f"ALTER TABLE {table} MODIFY COLUMN {column} {ddl}"))
                modified.append(f"{table}.{column}")
            except Exception as exc:
                errors.append(f"MODIFY {table}.{column}: {exc}")

    print(f"[schema-sync] Added {len(added)} column(s):")
    for name in added:
        print(f"  + {name}")
    print(f"[schema-sync] Modified {len(modified)} column(s):")
    for name in modified:
        print(f"  ~ {name}")
    if errors:
        print(f"[schema-sync] Errors ({len(errors)}):")
        for err in errors:
            print(f"  ! {err}")
    return {"added": added, "modified": modified, "errors": errors}


if __name__ == "__main__":
    db = settings.database
    url = (
        f"mysql+pymysql://{db['user']}:{db.get('password', '')}"
        f"@{db['host']}:{db.get('port', 3306)}/{db['db_name']}"
    )
    _engine = create_engine(url)
    result = sync_database_schema(_engine)
    if result["errors"]:
        sys.exit(1)
    print("[schema-sync] Done.")
