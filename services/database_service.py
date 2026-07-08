import sqlite3
import os
from config.settings import settings

class DatabaseService:
    def __init__(self):
        db_config = settings.database
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.db_path = os.path.join(project_root, db_config.get("db_file", "./database/app_db.sqlite"))
        
        # Đảm bảo thư mục cha của db tồn tại
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.init_db()

    def get_connection(self):
        return sqlite3.connect(self.db_path)

    def init_db(self):
        """Khởi tạo các bảng cơ sở dữ liệu nếu chưa tồn tại"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Bảng lưu thông tin người dùng
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    username TEXT PRIMARY KEY,
                    fullname TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # Bảng lưu lịch sử điểm danh
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS attendance_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL,
                    fullname TEXT NOT NULL,
                    score REAL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def add_user(self, username, fullname):
        """Thêm người dùng mới vào database"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT OR REPLACE INTO users (username, fullname) VALUES (?, ?)",
                    (username, fullname)
                )
                conn.commit()
                return True
        except Exception as e:
            print(f"Lỗi thêm người dùng vào SQLite: {e}")
            return False

    def get_user(self, username):
        """Lấy thông tin người dùng bằng username"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT fullname FROM users WHERE username = ?", (username,))
            row = cursor.fetchone()
            if row:
                return {"username": username, "fullname": row[0]}
            return None

    def log_attendance(self, username, fullname, score):
        """Ghi nhận log điểm danh vào SQLite"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO attendance_logs (username, fullname, score) VALUES (?, ?, ?)",
                    (username, fullname, score)
                )
                conn.commit()
                return True
        except Exception as e:
            print(f"Lỗi ghi log điểm danh vào SQLite: {e}")
            return False
