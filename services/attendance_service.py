import os
import csv
import time
from datetime import datetime, timedelta
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
        
        # Từ điển lưu thời gian điểm danh cuối của sinh viên: {mssv: timestamp}
        self.last_attendance = {}

    def init_csv_file(self):
        """Khởi tạo file CSV lưu log điểm danh nếu chưa tồn tại"""
        if not os.path.exists(self.log_file):
            with open(self.log_file, mode='w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(["Thời gian", "MSSV", "Họ tên", "Lớp chuyên ngành", "Mã buổi học", "Lớp tín chỉ", "Phòng học"])

    def get_active_session(self, mssv=None):
        """
        Tìm kiếm buổi học đang diễn ra trong ngày hôm nay.
        Nếu có mssv, ưu tiên tìm buổi học của lớp tín chỉ mà sinh viên đó có tham gia.
        """
        now = datetime.now()
        today_str = now.strftime("%Y-%m-%d")
        
        with self.db_service.get_connection() as conn:
            cursor = conn.cursor()
            if mssv:
                # Tìm các buổi học của lớp tín chỉ mà sinh viên tham gia
                cursor.execute("""
                    SELECT lh.ma_buoi_hoc, lh.ma_lop_tc, lh.ngay_hoc, lh.phong_hoc, lh.gio_bat_dau
                    FROM lich_hoc_chi_tiet lh
                    JOIN sinh_vien_lop_tin_chi sv_tc ON lh.ma_lop_tc = sv_tc.ma_lop_tc
                    WHERE sv_tc.mssv = ? AND lh.ngay_hoc = ?
                """, (mssv, today_str))
            else:
                # Tìm tất cả các buổi học hôm nay
                cursor.execute("""
                    SELECT ma_buoi_hoc, ma_lop_tc, ngay_hoc, phong_hoc, gio_bat_dau
                    FROM lich_hoc_chi_tiet
                    WHERE ngay_hoc = ?
                """, (today_str,))
                
            rows = cursor.fetchall()
            if not rows:
                # Nếu không tìm thấy buổi học hôm nay có liên quan trực tiếp, tìm bất kỳ buổi học nào trong ngày
                cursor.execute("""
                    SELECT ma_buoi_hoc, ma_lop_tc, ngay_hoc, phong_hoc, gio_bat_dau
                    FROM lich_hoc_chi_tiet
                    WHERE ngay_hoc = ?
                """, (today_str,))
                rows = cursor.fetchall()
                if not rows:
                    return None
            
            # Chọn buổi học phù hợp nhất (đang trong giờ học hoặc lệch không quá 3 tiếng)
            for row in rows:
                ma_buoi_hoc, ma_lop_tc, ngay_hoc, phong_hoc, gio_bat_dau = row
                try:
                    # Xử lý parse thời gian bắt đầu
                    clean_time = gio_bat_dau.strip()
                    if len(clean_time) == 5: # HH:MM
                        clean_time += ":00"
                    
                    start_time = datetime.strptime(f"{today_str} {clean_time}", "%Y-%m-%d %H:%M:%S")
                    end_time = start_time + timedelta(hours=3)
                    early_time = start_time - timedelta(minutes=30)
                    
                    if early_time <= now <= end_time:
                        return {
                            "ma_buoi_hoc": ma_buoi_hoc,
                            "ma_lop_tc": ma_lop_tc,
                            "ngay_hoc": ngay_hoc,
                            "phong_hoc": phong_hoc,
                            "gio_bat_dau": gio_bat_dau
                        }
                except Exception as e:
                    print(f"Lỗi phân tích giờ học {gio_bat_dau}: {e}")
            
            # Fallback lấy buổi đầu tiên tìm thấy trong ngày
            return {
                "ma_buoi_hoc": rows[0][0],
                "ma_lop_tc": rows[0][1],
                "ngay_hoc": rows[0][2],
                "phong_hoc": rows[0][3],
                "gio_bat_dau": rows[0][4]
            }

    def record_attendance(self, mssv, ma_buoi_hoc=None, score=0.0):
        """Ghi nhận điểm danh cho sinh viên"""
        if mssv == "Unknown":
            return False

        current_time = time.time()
        last_time = self.last_attendance.get(mssv, 0)
        
        # Nếu chưa qua thời gian cooldown, bỏ qua ghi nhận
        if current_time - last_time < self.cooldown_seconds:
            return False

        # Truy vấn thông tin sinh viên
        sv_info = self.db_service.get_sinh_vien(mssv)
        if not sv_info:
            print(f"-> Không tìm thấy sinh viên {mssv} trong DB.")
            return False

        # Nếu không truyền ma_buoi_hoc, tự động tìm buổi học đang diễn ra
        if ma_buoi_hoc is None:
            session = self.get_active_session(mssv)
            if not session:
                print(f"-> [DIEM DANH THAT BAI] Khong tim thay buoi hoc nao dang dien ra cho {mssv}.")
                return False
            ma_buoi_hoc = session["ma_buoi_hoc"]
            ma_lop_tc = session["ma_lop_tc"]
            phong_hoc = session["phong_hoc"]
        else:
            # Truy vấn thông tin buổi học từ DB
            with self.db_service.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT ma_lop_tc, phong_hoc FROM lich_hoc_chi_tiet WHERE ma_buoi_hoc = ?", (ma_buoi_hoc,))
                row = cursor.fetchone()
                if row:
                    ma_lop_tc, phong_hoc = row
                else:
                    ma_lop_tc, phong_hoc = "Unknown", "Unknown"

        # Ghi nhận vào SQLite
        self.db_service.log_diem_danh(mssv, ma_buoi_hoc, "Co mat")
        
        # Ghi nhận vào file CSV log để lưu trữ sơ cua
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        try:
            with open(self.log_file, mode='a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([now_str, mssv, sv_info["ho_ten"], sv_info["lop_base"], ma_buoi_hoc, ma_lop_tc, phong_hoc])
            print(f"-> [DIEM DANH THANH CONG] {sv_info['ho_ten']} ({mssv}) tai buoi {ma_buoi_hoc} luc {now_str} (Score: {score:.2f})")
        except Exception as e:
            print(f"Lỗi ghi log CSV: {e}")

        # Cập nhật thời gian cooldown mới nhất
        self.last_attendance[mssv] = current_time
        return True
