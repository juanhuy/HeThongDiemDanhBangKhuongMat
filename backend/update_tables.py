from app.db.session import engine
from sqlalchemy import text

with engine.begin() as conn:
    print("Updating lecturers table...")
    # Thêm cột mới
    try: conn.execute(text("ALTER TABLE lecturers ADD COLUMN profile_id INT"))
    except: pass
    try: conn.execute(text("ALTER TABLE lecturers ADD COLUMN academic_title VARCHAR(50) DEFAULT NULL"))
    except: pass
    try: conn.execute(text("ALTER TABLE lecturers ADD COLUMN position VARCHAR(100) DEFAULT NULL"))
    except: pass
    try: conn.execute(text("ALTER TABLE lecturers ADD COLUMN employment_type VARCHAR(50) DEFAULT NULL"))
    except: pass
    try: conn.execute(text("ALTER TABLE lecturers ADD COLUMN teaching_status VARCHAR(50) DEFAULT 'Active'"))
    except: pass
    try: conn.execute(text("ALTER TABLE lecturers ADD COLUMN hire_date DATE DEFAULT NULL"))
    except: pass

    # Xóa cột cũ (Nếu không cần dữ liệu cũ hoặc để trống sau này drop)
    # Bỏ qua không xóa, nhưng cần gỡ thuộc tính NOT NULL nếu có để CRUD insert không bị lỗi
    try: conn.execute(text("ALTER TABLE lecturers MODIFY account_id INT NULL"))
    except: pass
    try: conn.execute(text("ALTER TABLE lecturers MODIFY full_name VARCHAR(50) NULL"))
    except: pass
    try: conn.execute(text("ALTER TABLE lecturers MODIFY email VARCHAR(50) NULL"))
    except: pass
    
    print("Updating subjects table...")
    try: conn.execute(text("ALTER TABLE subjects ADD COLUMN theory_credits INT DEFAULT 0"))
    except: pass
    try: conn.execute(text("ALTER TABLE subjects ADD COLUMN practical_credits INT DEFAULT 0"))
    except: pass
    try: conn.execute(text("ALTER TABLE subjects ADD COLUMN department VARCHAR(100) DEFAULT NULL"))
    except: pass

    print("Done")
