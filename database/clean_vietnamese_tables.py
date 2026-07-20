import pymysql
import sys
import os

# Nạp config để lấy thông tin kết nối
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)
from config.settings import settings

def clean_old_tables():
    db_config = settings.database
    host = db_config.get("host", "127.0.0.1")
    port = int(db_config.get("port", 3306))
    user = db_config.get("user", "root")
    password = db_config.get("password", "")
    db_name = db_config.get("db_name", "ptit_diem_danh")

    print(f"Connecting to database {db_name} at {host}:{port}...")
    try:
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=db_name
        )
        
        # Danh sách bảng tiếng Việt cũ cần xoá theo thứ tự phụ thuộc khóa ngoại
        old_tables = [
            "don_xin_phep",
            "lich_su_diem_danh",
            "tai_khoan",
            "sinh_vien_lop_tin_chi",
            "lich_hoc_chi_tiet",
            "lop_tin_chi",
            "sinh_vien",
            "mon_hoc"
        ]
        
        with conn.cursor() as cursor:
            # Tắt tạm khóa ngoại để tránh lỗi ràng buộc khi xóa
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
            
            for table in old_tables:
                print(f"Dropping table {table}...")
                cursor.execute(f"DROP TABLE IF EXISTS {table};")
                
            # Bật lại khóa ngoại
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
            
        conn.commit()
        conn.close()
        print("Database cleanup completed successfully!")
    except Exception as e:
        print(f"Error during database cleanup: {e}")

if __name__ == "__main__":
    clean_old_tables()
