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
                    SELECT lh.schedule_id, lh.class_id, lh.study_date, lh.room, lh.start_time
                    FROM class_schedules lh
                    JOIN student_class_enrollment sv_tc ON lh.class_id = sv_tc.class_id
                    WHERE sv_tc.student_id = %s AND lh.study_date = %s
                """, (mssv, today_str))
            else:
                # Tìm tất cả các buổi học hôm nay
                cursor.execute("""
                    SELECT schedule_id, class_id, study_date, room, start_time
                    FROM class_schedules
                    WHERE study_date = %s
                """, (today_str,))
                
            rows = cursor.fetchall()
            if not rows:
                # Nếu không tìm thấy buổi học hôm nay có liên quan trực tiếp, tìm bất kỳ buổi học nào trong ngày
                cursor.execute("""
                    SELECT schedule_id, class_id, study_date, room, start_time
                    FROM class_schedules
                    WHERE study_date = %s
                """, (today_str,))
                rows = cursor.fetchall()
                if not rows:
                    return None
            
            # Chọn buổi học phù hợp nhất (đang trong giờ học hoặc lệch không quá 3 tiếng)
            for row in rows:
                ma_buoi_hoc, ma_lop_tc, ngay_hoc, phong_hoc, gio_bat_dau = row
                try:
                    # Xử lý parse thời gian bắt đầu
                    clean_time = str(gio_bat_dau).strip()
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

    def record_attendance(self, mssv, ma_buoi_hoc=None, phong_hoc=None, score=0.0):
        """
        Ghi nhận điểm danh cho sinh viên theo Quy trình Điểm danh Tự động 6 bước.
        Trả về tuple: (success: bool, status_or_error_msg: str, sv_info: dict or None)
        """
        # BƯỚC 3: ĐỐI CHIẾU VECTOR VỚI AI (Kiểm tra người lạ trước)
        if mssv == "Unknown":
            return False, "Người lạ/Chưa đăng ký mặt.", None

        # Truy vấn thông tin sinh viên và kiểm tra phê duyệt hồ sơ
        sv_info = self.db_service.get_sinh_vien(mssv)
        if not sv_info:
            return False, "Người lạ/Chưa đăng ký mặt.", None

        # Xác định thời gian hiện tại
        now = datetime.now()
        today_str = now.strftime("%Y-%m-%d")
        current_time_str = now.strftime("%H:%M:%S")

        # BƯỚC 1 & 2: XÁC ĐỊNH LỊCH HỌC TẠI PHÒNG & BỘ LỌC CỬA SỔ THỜI GIAN
        session = None
        if ma_buoi_hoc is not None:
            # Lấy thông tin buổi học cụ thể
            with self.db_service.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT schedule_id, class_id, study_date, room, start_time 
                    FROM class_schedules WHERE schedule_id = %s
                """, (ma_buoi_hoc,))
                row = cursor.fetchone()
                if row:
                    session = {
                        "ma_buoi_hoc": row[0],
                        "ma_lop_tc": row[1],
                        "ngay_hoc": str(row[2]),
                        "phong_hoc": row[3],
                        "gio_bat_dau": str(row[4])
                    }
                else:
                    return False, "Buổi học không tồn tại.", None
        else:
            # Nếu có phong_hoc, quét các buổi học tại phòng này hôm nay
            room_to_check = phong_hoc if phong_hoc else (sv_info.get("lop_base") or "Unknown")
            
            with self.db_service.get_connection() as conn:
                cursor = conn.cursor()
                # Thử tìm các buổi học trong phòng này hôm nay
                if phong_hoc:
                    cursor.execute("""
                        SELECT schedule_id, class_id, study_date, room, start_time 
                        FROM class_schedules 
                        WHERE room = %s AND study_date = %s
                    """, (phong_hoc, today_str))
                else:
                    # Nếu không truyền phòng, tìm bất kỳ buổi học nào trong ngày mà sinh viên có đăng ký
                    cursor.execute("""
                        SELECT lh.schedule_id, lh.class_id, lh.study_date, lh.room, lh.start_time 
                        FROM class_schedules lh
                        JOIN student_class_enrollment sv_tc ON lh.class_id = sv_tc.class_id
                        WHERE sv_tc.student_id = %s AND lh.study_date = %s
                    """, (mssv, today_str))
                
                rows = cursor.fetchall()
                if not rows:
                    return False, "Phòng không có lịch học.", None

                # Áp dụng Cửa sổ điểm danh (Attendance Window)
                # Mở: trước 30 phút. Đóng: sau 60 phút.
                valid_sessions = []
                for r in rows:
                    try:
                        clean_time = str(r[4]).strip()
                        if len(clean_time) == 5:
                            clean_time += ":00"
                        
                        start_time = datetime.strptime(f"{today_str} {clean_time}", "%Y-%m-%d %H:%M:%S")
                        early_time = start_time - timedelta(minutes=30)
                        late_time = start_time + timedelta(minutes=60)
                        
                        if early_time <= now <= late_time:
                            valid_sessions.append({
                                "ma_buoi_hoc": r[0],
                                "ma_lop_tc": r[1],
                                "ngay_hoc": str(r[2]),
                                "phong_hoc": r[3],
                                "gio_bat_dau": str(r[4])
                            })
                    except Exception as e:
                        print(f"Loi phan tich thoi gian: {e}")

                if not valid_sessions:
                    return False, "Sai ca học/Quét quá sớm.", None
                
                # Ưu tiên buổi học mà sinh viên này thực sự tham gia (nếu có nhiều ca)
                session = valid_sessions[0]
                for vs in valid_sessions:
                    cursor.execute("""
                        SELECT COUNT(*) FROM student_class_enrollment 
                        WHERE class_id = %s AND student_id = %s
                    """, (vs["ma_lop_tc"], mssv))
                    if cursor.fetchone()[0] > 0:
                        session = vs
                        break

        ma_buoi_hoc = session["ma_buoi_hoc"]
        ma_lop_tc = session["ma_lop_tc"]
        phong_hoc = session["phong_hoc"]
        gio_bat_dau_str = session["gio_bat_dau"]

        # BƯỚC 4: KIỂM TRA SĨ SỐ TÍN CHỈ (Đối chiếu danh sách lớp)
        with self.db_service.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT COUNT(*) FROM student_class_enrollment 
                WHERE class_id = %s AND student_id = %s
            """, (ma_lop_tc, mssv))
            if cursor.fetchone()[0] == 0:
                return False, "SV không thuộc lớp tín chỉ này.", None

        # BƯỚC 5: ĐÁNH GIÁ THỜI GIAN VÀO LỚP
        try:
            clean_start = str(gio_bat_dau_str).strip()
            if len(clean_start) == 5:
                clean_start += ":00"
            start_time_only = datetime.strptime(clean_start, "%H:%M:%S").time()
            current_time_only = now.time()
            
            if current_time_only <= start_time_only:
                trang_thai = "Đúng giờ"
            else:
                trang_thai = "Đi muộn"
        except Exception as e:
            print(f"Loi so sanh gio hoc: {e}")
            trang_thai = "Đúng giờ" # Fallback an toàn

        # Cooldown check
        current_ts = time.time()
        last_time = self.last_attendance.get(mssv, 0)
        if current_ts - last_time < self.cooldown_seconds:
            # Vẫn ghi nhận thành công nhưng bỏ qua viết tiếp SQL/CSV để tránh overload
            return True, trang_thai, sv_info

        # BƯỚC 6: GHI NHẬN VÀO MYSQL LOGS
        db_success = self.db_service.log_diem_danh(mssv, ma_buoi_hoc, trang_thai, "AI")
        if not db_success:
            return False, "Lỗi ghi nhận database.", None

        # Ghi nhận vào file CSV log để lưu trữ backup
        now_str = now.strftime("%Y-%m-%d %H:%M:%S")
        try:
            with open(self.log_file, mode='a', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow([now_str, mssv, sv_info["ho_ten"], sv_info["lop_base"], ma_buoi_hoc, ma_lop_tc, phong_hoc])
            print(f"-> [DIEM DANH THANH CONG] {sv_info['ho_ten']} ({mssv}) - {trang_thai} tai phong {phong_hoc} luc {now_str} (Score: {score:.2f})")
        except Exception as e:
            print(f"Lỗi ghi log CSV: {e}")

        # Cập nhật thời gian cooldown mới nhất
        self.last_attendance[mssv] = current_ts
        return True, trang_thai, sv_info
