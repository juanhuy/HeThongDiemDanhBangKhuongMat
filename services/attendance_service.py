import os
import csv
import time
from datetime import datetime
from config.settings import settings
from services.database_service import DatabaseService

class AttendanceService:
    def __init__(self, db_service: DatabaseService):
        self.db_service = db_service
        
        # Đọc cấu hình
        att_config = settings.attendance
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.log_file = os.path.join(project_root, att_config.get("log_file", "./logs/attendance_log.csv"))
        self.cooldown_seconds = att_config.get("cooldown_seconds", 30)
        
        # Đảm bảo thư mục cha của file log tồn tại
        os.makedirs(os.path.dirname(self.log_file), exist_ok=True)
        self.init_csv_file()
        
        # Từ điển lưu thời gian điểm danh cuối của người dùng: {username: timestamp}
        self.last_attendance = {}

    def init_csv_file(self):
        """Khởi tạo file CSV nếu chưa tồn tại"""
        if not os.path.exists(self.log_file):
            with open(self.log_file, mode='w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(["Thời gian", "Tên tài khoản (ID)", "Họ tên", "Độ tin cậy"])

    def record_attendance(self, username, score):
        """Ghi nhận điểm danh nếu vượt qua thời gian giãn cách (cooldown)"""
        if username == "Unknown":
            return False

        current_time = time.time()
        last_time = self.last_attendance.get(username, 0)
        
        # Nếu chưa qua thời gian cooldown, bỏ qua ghi nhận
        if current_time - last_time < self.cooldown_seconds:
            return False

        # Truy vấn họ tên từ Database SQLite
        user_info = self.db_service.get_user(username)
        fullname = user_info["fullname"] if user_info else username

        # Ghi nhận vào SQLite
        self.db_service.log_attendance(username, fullname, float(score))
        
        # Ghi nhận vào CSV
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        try:
            with open(self.log_file, mode='a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([now_str, username, fullname, f"{score:.2f}"])
            print(f"-> [DIEM DANH THANH CONG] {username} luc {now_str}")
        except Exception as e:
            print(f"Loi ghi log CSV: {e}")


        # Cập nhật thời gian cooldown mới nhất
        self.last_attendance[username] = current_time
        return True
