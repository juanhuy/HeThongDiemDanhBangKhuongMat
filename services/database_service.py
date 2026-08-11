import pymysql
import os
import numpy as np
from config.settings import settings

class DatabaseService:
    def __init__(self):
        self.db_config = settings.database
        self.host = self.db_config.get("host", "127.0.0.1")
        self.port = int(self.db_config.get("port", 3306))
        self.user = self.db_config.get("user", "root")
        self.password = self.db_config.get("password", "")
        self.db_name = self.db_config.get("db_name", "ptit_diem_danh")
        
        # Đảm bảo tạo database nếu chưa tồn tại
        self.create_database_if_not_exists()
        self.init_db()

    def create_database_if_not_exists(self):
        """Tạo database MySQL nếu chưa có"""
        try:
            conn = pymysql.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password
            )
            with conn.cursor() as cursor:
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS {self.db_name} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Loi khoi tao database MySQL: {e}")

    def get_connection(self):
        """Trả về đối tượng kết nối cơ sở dữ liệu MySQL"""
        return pymysql.connect(
            host=self.host,
            port=self.port,
            user=self.user,
            password=self.password,
            database=self.db_name
        )

    def init_db(self):
        """Khởi tạo các bảng mặc định nếu chưa tồn tại (Dọn sạch các bảng tiếng Việt, các bảng tiếng Anh được quản lý bởi SQLAlchemy backend)"""
        # Lưu ý: Các bảng tiếng Anh sẽ được backend FastAPI tự động khởi tạo qua SQLAlchemy.
        # Ở đây ta chỉ khởi tạo dữ liệu mặc định ban đầu nếu chưa có.
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                # Tự động chèn tài khoản mặc định admin admin / 123456
                cursor.execute("SHOW TABLES LIKE 'accounts'")
                if cursor.fetchone():
                    cursor.execute("SELECT COUNT(*) FROM accounts WHERE username = 'admin'")
                    if cursor.fetchone()[0] == 0:
                        pw_hash = self.hash_password("123456")
                        cursor.execute("""
                            INSERT INTO accounts (username, password_hash, role, is_active)
                            VALUES ('admin', %s, 'admin', True)
                        """, (pw_hash,))
                        
                    # Tự động chèn tài khoản giảng viên mặc định để kiểm thử gv1 / 123456
                    cursor.execute("SELECT COUNT(*) FROM accounts WHERE username = 'gv1'")
                    if cursor.fetchone()[0] == 0:
                        pw_hash = self.hash_password("123456")
                        cursor.execute("""
                            INSERT INTO accounts (username, password_hash, role, is_active)
                            VALUES ('gv1', %s, 'giang_vien', True)
                        """, (pw_hash,))

                # Xóa toàn bộ dữ liệu sinh viên giả lập/thử nghiệm nếu tồn tại
                cursor.execute("SHOW TABLES LIKE 'students'")
                if cursor.fetchone():
                    # Chỉ xóa TEST01 nếu cần thiết, hoặc không cần xóa gì cả để bảo toàn dữ liệu kiểm thử
                    pass
            conn.commit()
        except Exception as e:
            print(f"Loi khoi tao cau truc/du lieu mac dinh MySQL: {e}")
        finally:
            conn.close()

    @staticmethod
    def vector_to_string(vector):
        if vector is None:
            return ""
        if isinstance(vector, np.ndarray):
            vector = vector.tolist()
        return ",".join(map(str, vector))

    @staticmethod
    def string_to_vector(vector_str):
        if not vector_str:
            return None
        try:
            return np.array(list(map(float, vector_str.split(","))), dtype=np.float32)
        except Exception as e:
            print(f"Loi phan giai vector: {e}")
            return None

    def add_sinh_vien(self, mssv, ho_ten, lop_base, face_vector, ngay_sinh=None, gioi_tinh=None, sdt=None, cccd=None, dan_toc=None, ton_giao=None, noi_sinh=None, quoc_tich=None, email=None, dia_chi=None):
        """Thêm hoặc cập nhật sinh viên với các thông tin chi tiết"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                # 0. Tạo tài khoản đăng nhập tự động cho sinh viên nếu chưa có
                username_lower = str(mssv).strip().lower()
                cursor.execute("SELECT account_id FROM accounts WHERE username = %s", (username_lower,))
                account_row = cursor.fetchone()
                if account_row:
                    account_id = account_row[0]
                else:
                    # Tạo tài khoản mới với mật khẩu mặc định 123456
                    pw_hash = self.hash_password("123456")
                    cursor.execute("""
                        INSERT INTO accounts (username, password_hash, role, is_active)
                        VALUES (%s, %s, 'sinh_vien', True)
                    """, (username_lower, pw_hash))
                    account_id = cursor.lastrowid

                # 1. Thêm hoặc cập nhật bảng user_profiles
                email_val = email or f"{mssv}@student.ptit.edu.vn"
                cursor.execute("SELECT profile_id FROM user_profiles WHERE account_id = %s", (account_id,))
                profile_row = cursor.fetchone()
                
                if profile_row:
                    profile_id = profile_row[0]
                    cursor.execute("""
                        UPDATE user_profiles 
                        SET full_name = %s, phone_number = %s, personal_email = %s
                        WHERE profile_id = %s
                    """, (ho_ten, sdt, email_val, profile_id))
                else:
                    cursor.execute("""
                        INSERT INTO user_profiles (account_id, full_name, phone_number, personal_email)
                        VALUES (%s, %s, %s, %s)
                    """, (account_id, ho_ten, sdt, email_val))
                    profile_id = cursor.lastrowid

                # 2. Thêm hoặc cập nhật bảng students
                cursor.execute("""
                    INSERT INTO students (student_id, profile_id, administrative_class, academic_status)
                    VALUES (%s, %s, %s, 'studying')
                    ON DUPLICATE KEY UPDATE 
                        profile_id = COALESCE(students.profile_id, VALUES(profile_id)),
                        administrative_class = VALUES(administrative_class)
                """, (mssv, profile_id, lop_base))
                
                # 3. Xóa các đặc trưng khuôn mặt cũ của sinh viên này
                cursor.execute("DELETE FROM face_features WHERE student_id = %s", (mssv,))
                
                # 4. Thêm vector khuôn mặt nhị phân mới vào bảng face_features
                if face_vector is not None:
                    if isinstance(face_vector, np.ndarray):
                        vector_bytes = face_vector.tobytes()
                    else:
                        vector_bytes = face_vector
                    from core.crypto_utils import encrypt_vector
                    encrypted_bytes = encrypt_vector(vector_bytes)
                    cursor.execute("""
                        INSERT INTO face_features (student_id, face_vector, is_primary)
                        VALUES (%s, %s, True)
                    """, (mssv, encrypted_bytes))
            conn.commit()
            return True
        except Exception as e:
            print(f"Loi them sinh vien vao MySQL: {e}")
            return False
        finally:
            conn.close()

    def get_sinh_vien(self, mssv):
        """Lấy thông tin một sinh viên"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT p.full_name, s.administrative_class, p.personal_email, p.phone_number, f.face_vector
                    FROM students s
                    JOIN user_profiles p ON s.profile_id = p.profile_id
                    LEFT JOIN face_features f ON s.student_id = f.student_id AND f.is_primary = True
                    WHERE s.student_id = %s
                """, (mssv,))
                row = cursor.fetchone()
                if row:
                    face_vector = None
                    if row[4]:
                        from core.crypto_utils import decrypt_vector
                        try:
                            decrypted = decrypt_vector(row[4])
                            face_vector = np.frombuffer(decrypted, dtype=np.float32)
                        except Exception:
                            face_vector = np.frombuffer(row[4], dtype=np.float32)
                    return {
                        "mssv": mssv,
                        "ho_ten": row[0],
                        "lop_base": row[1],
                        "email": row[2],
                        "sdt": row[3],
                        "face_vector": face_vector,
                        "ngay_sinh": None,
                        "gioi_tinh": None,
                        "cccd": None,
                        "dan_toc": None,
                        "ton_giao": None,
                        "noi_sinh": None,
                        "quoc_tich": None,
                        "dia_chi": None
                    }
                return None
        except Exception as e:
            print(f"Loi lay thong tin sinh vien tu MySQL: {e}")
            return None
        finally:
            conn.close()

    def get_all_sinh_vien(self):
        """Lấy toàn bộ sinh viên có face_vector"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT s.student_id, p.full_name, s.administrative_class, f.face_vector, p.personal_email, p.phone_number
                    FROM students s
                    JOIN user_profiles p ON s.profile_id = p.profile_id
                    INNER JOIN face_features f ON s.student_id = f.student_id AND f.is_primary = True
                """)
                rows = cursor.fetchall()
                result = []
                for r in rows:
                    face_vector = None
                    if r[3]:
                        from core.crypto_utils import decrypt_vector
                        try:
                            decrypted = decrypt_vector(r[3])
                            face_vector = np.frombuffer(decrypted, dtype=np.float32)
                        except Exception:
                            face_vector = np.frombuffer(r[3], dtype=np.float32)
                    result.append({
                        "mssv": r[0],
                        "ho_ten": r[1],
                        "lop_base": r[2],
                        "face_vector": face_vector,
                        "email": r[4],
                        "sdt": r[5],
                        "ngay_sinh": None,
                        "gioi_tinh": None,
                        "cccd": None,
                        "dan_toc": None,
                        "ton_giao": None,
                        "noi_sinh": None,
                        "quoc_tich": None,
                        "dia_chi": None
                    })
                return result
        except Exception as e:
            print(f"Loi lay toan bo sinh vien tu MySQL: {e}")
            return []
        finally:
            conn.close()

    def add_mon_hoc(self, ma_mon, ten_mon):
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("REPLACE INTO subjects (subject_id, subject_name, credits) VALUES (%s, %s, 3)", (ma_mon, ten_mon))
            conn.commit()
            return True
        except Exception as e:
            print(f"Loi them mon hoc: {e}")
            return False
        finally:
            conn.close()

    def add_lop_tin_chi(self, ma_lop_tc, ma_mon):
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("REPLACE INTO credit_classes (class_id, subject_id) VALUES (%s, %s)", (ma_lop_tc, ma_mon))
            conn.commit()
            return True
        except Exception as e:
            print(f"Loi them lop tin chi: {e}")
            return False
        finally:
            conn.close()

    def add_sinh_vien_vao_lop(self, ma_lop_tc, mssv):
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("REPLACE INTO student_class_enrollment (class_id, student_id) VALUES (%s, %s)", (ma_lop_tc, mssv))
            conn.commit()
            return True
        except Exception as e:
            print(f"Loi them sinh vien vao lop tin chi: {e}")
            return False
        finally:
            conn.close()

    def add_lich_hoc(self, ma_lop_tc, ngay_hoc, phong_hoc, gio_bat_dau):
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO class_schedules (class_id, study_date, room, start_time) VALUES (%s, %s, %s, %s)",
                    (ma_lop_tc, ngay_hoc, phong_hoc, gio_bat_dau)
                )
            conn.commit()
            return True
        except Exception as e:
            print(f"Loi them lich hoc: {e}")
            return False
        finally:
            conn.close()

    def log_diem_danh(self, mssv, ma_buoi_hoc, trang_thai="Co mat", nguoi_xac_nhan="AI"):
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                # Kiểm tra xem đã có bản ghi điểm danh chưa
                cursor.execute(
                    "SELECT attendance_id FROM attendance_histories WHERE student_id = %s AND schedule_id = %s",
                    (mssv, ma_buoi_hoc)
                )
                row = cursor.fetchone()
                if row:
                    cursor.execute(
                        "UPDATE attendance_histories SET status = %s, confirmed_by = %s, check_in_time = CURRENT_TIMESTAMP WHERE attendance_id = %s",
                        (trang_thai, nguoi_xac_nhan, row[0])
                    )
                else:
                    cursor.execute(
                        "INSERT INTO attendance_histories (student_id, schedule_id, status, confirmed_by) VALUES (%s, %s, %s, %s)",
                        (mssv, ma_buoi_hoc, trang_thai, nguoi_xac_nhan)
                    )
            conn.commit()
            return True
        except Exception as e:
            print(f"Loi ghi nhan diem danh: {e}")
            return False
        finally:
            conn.close()

    def approve_face_registration(self, mssv):
        """Duyệt hồ sơ khuôn mặt sinh viên (Không dùng cột này nữa ở DB mới, luôn trả về True)"""
        return True

    def submit_leave_request(self, mssv, ma_buoi_hoc, ly_do, minh_chung):
        """Gửi đơn xin nghỉ phép"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO leave_requests (student_id, schedule_id, reason, evidence) VALUES (%s, %s, %s, %s)",
                    (mssv, ma_buoi_hoc, ly_do, minh_chung)
                )
            conn.commit()
            return True
        except Exception as e:
            print(f"Loi nop don xin phep: {e}")
            return False
        finally:
            conn.close()

    def get_leave_requests(self, ma_lop_tc=None):
        """Lấy danh sách đơn xin nghỉ phép"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                query = """
                    SELECT lr.request_id, lr.student_id, p.full_name, lr.schedule_id, cs.study_date, cs.start_time, cs.class_id,
                           lr.reason, lr.evidence, lr.status, lr.approved_by
                    FROM leave_requests lr
                    JOIN students s ON lr.student_id = s.student_id
                    JOIN user_profiles p ON s.profile_id = p.profile_id
                    JOIN class_schedules cs ON lr.schedule_id = cs.schedule_id
                """
                params = []
                if ma_lop_tc:
                    query += " WHERE cs.class_id = %s"
                    params.append(ma_lop_tc)
                query += " ORDER BY lr.request_id DESC"
                cursor.execute(query, tuple(params))
                rows = cursor.fetchall()
                result = []
                for r in rows:
                    result.append({
                        "id": r[0],
                        "mssv": r[1],
                        "ho_ten": r[2],
                        "ma_buoi_hoc": r[3],
                        "ngay_hoc": str(r[4]),
                        "gio_bat_dau": str(r[5]),
                        "ma_lop_tc": r[6],
                        "ly_do": r[7],
                        "minh_chung": r[8],
                        "trang_thai": r[9],
                        "nguoi_duyet": r[10]
                    })
                return result
        except Exception as e:
            print(f"Loi lay danh sach don xin phep: {e}")
            return []
        finally:
            conn.close()

    def approve_leave_request(self, request_id, nguoi_duyet):
        """Duyệt đơn nghỉ phép: trạng thái 'Approved', ghi nhận điểm danh 'Có phép'"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                # Lấy mssv và ma_buoi_hoc từ đơn
                cursor.execute("SELECT student_id, schedule_id FROM leave_requests WHERE request_id = %s", (request_id,))
                row = cursor.fetchone()
                if not row:
                    return False
                student_id, schedule_id = row
                
                # Cập nhật trạng thái đơn nghỉ phép
                cursor.execute(
                    "UPDATE leave_requests SET status = 'Approved', approved_by = %s WHERE request_id = %s",
                    (nguoi_duyet, request_id)
                )
                
                # Ghi nhận/Cập nhật bảng điểm danh
                cursor.execute(
                    "SELECT attendance_id FROM attendance_histories WHERE student_id = %s AND schedule_id = %s",
                    (student_id, schedule_id)
                )
                att_row = cursor.fetchone()
                if att_row:
                    cursor.execute(
                        "UPDATE attendance_histories SET status = 'Có phép', confirmed_by = %s, check_in_time = CURRENT_TIMESTAMP WHERE attendance_id = %s",
                        (nguoi_duyet, att_row[0])
                    )
                else:
                    cursor.execute(
                        "INSERT INTO attendance_histories (student_id, schedule_id, status, confirmed_by) VALUES (%s, %s, 'Có phép', %s)",
                        (student_id, schedule_id, nguoi_duyet)
                    )
            conn.commit()
            return True
        except Exception as e:
            print(f"Loi duyet don xin phep: {e}")
            return False
        finally:
            conn.close()

    def reject_leave_request(self, request_id, nguoi_duyet):
        """Từ chối đơn nghỉ phép"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE leave_requests SET status = 'Rejected', approved_by = %s WHERE request_id = %s",
                    (nguoi_duyet, request_id)
                )
            conn.commit()
            return True
        except Exception as e:
            print(f"Loi tu choi don xin phep: {e}")
            return False
        finally:
            conn.close()

    def manual_check_in(self, mssv, ma_buoi_hoc, trang_thai, nguoi_xac_nhan):
        """Điểm danh thủ công (Manual Check-in) bởi Giảng viên"""
        return self.log_diem_danh(mssv, ma_buoi_hoc, trang_thai, nguoi_xac_nhan)

    def calculate_attendance_report(self, ma_lop_tc):
        """Tính điểm chuyên cần, số buổi vắng và tự động Cấm thi"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                # 1. Lấy tất cả buổi học đã diễn ra cho lớp tín chỉ này (class_schedules)
                cursor.execute("""
                    SELECT schedule_id FROM class_schedules 
                    WHERE class_id = %s AND (study_date < CURRENT_DATE OR (study_date = CURRENT_DATE AND start_time <= CURRENT_TIME))
                """, (ma_lop_tc,))
                buoi_hoc_rows = cursor.fetchall()
                buoi_hoc_ids = [r[0] for r in buoi_hoc_rows]
                tong_buoi = len(buoi_hoc_ids)
                
                # 2. Lấy danh sách sinh viên đăng ký lớp (student_class_enrollment join students join user_profiles)
                cursor.execute("""
                    SELECT s.student_id, p.full_name, s.administrative_class 
                    FROM student_class_enrollment sv_tc
                    JOIN students s ON sv_tc.student_id = s.student_id
                    JOIN user_profiles p ON s.profile_id = p.profile_id
                    WHERE sv_tc.class_id = %s
                """, (ma_lop_tc,))
                sinh_vien_list = cursor.fetchall()
                
                report = []
                for student_id, ho_ten, lop_base in sinh_vien_list:
                    # Đếm các trạng thái điểm danh
                    # Nếu chưa có log thì mặc định là Vắng không phép
                    dung_gio = 0
                    di_muon = 0
                    co_phep = 0
                    vang_kp = 0
                    
                    for ma_buoi in buoi_hoc_ids:
                        cursor.execute("""
                            SELECT status FROM attendance_histories 
                            WHERE student_id = %s AND schedule_id = %s
                        """, (student_id, ma_buoi))
                        row = cursor.fetchone()
                        if row:
                            status = row[0]
                            if status in ["Đúng giờ", "Co mat"]:
                                dung_gio += 1
                            elif status == "Đi muộn":
                                di_muon += 1
                            elif status == "Có phép":
                                co_phep += 1
                            elif status in ["Vắng không phép", "Vang"]:
                                vang_kp += 1
                            else:
                                # Trạng thái khác
                                dung_gio += 1
                        else:
                            # Không có record -> Vắng không phép
                            vang_kp += 1
                    
                    # Tính điểm chuyên cần: bắt đầu từ 10.0
                    # Vắng không phép -> -2.0
                    # Vắng có phép -> -0
                    # Đi muộn -> -0.5
                    score = 10.0 - (vang_kp * 2.0) - (di_muon * 0.5)
                    score = max(0.0, score)
                    
                    # 3 lần đi muộn tương đương 1 lần vắng không phép
                    so_buoi_vang_quy_doi = vang_kp + (di_muon // 3)
                    
                    # Tỷ lệ vắng = (Số buổi vắng quy đổi / Tổng số buổi học) * 100%
                    ty_le_vang = (so_buoi_vang_quy_doi / tong_buoi * 100) if tong_buoi > 0 else 0.0
                    
                    trang_thai_hoc_tap = "Active"
                    if ty_le_vang > 20.0:
                        trang_thai_hoc_tap = "Cam thi"
                        # Cập nhật DB
                        cursor.execute("""
                            UPDATE student_class_enrollment 
                            SET academic_status = 'Cam thi' 
                            WHERE class_id = %s AND student_id = %s
                        """, (ma_lop_tc, student_id))
                    else:
                        cursor.execute("""
                            UPDATE student_class_enrollment 
                            SET academic_status = 'Active' 
                            WHERE class_id = %s AND student_id = %s
                        """, (ma_lop_tc, student_id))
                        
                    report.append({
                        "mssv": student_id,
                        "ho_ten": ho_ten,
                        "lop_base": lop_base,
                        "dung_gio": dung_gio,
                        "di_muon": di_muon,
                        "co_phep": co_phep,
                        "vang_kp": vang_kp,
                        "score": score,
                        "ty_le_vang": round(ty_le_vang, 2),
                        "trang_thai": trang_thai_hoc_tap
                    })
                
            conn.commit()
            return report
        except Exception as e:
            print(f"Loi tinh toan bao cao: {e}")
            return []
        finally:
            conn.close()

    @staticmethod
    def hash_password(password: str) -> str:
        """Mã hóa mật khẩu bằng bcrypt (tương thích app.core.security)."""
        import bcrypt
        pwd_bytes = password.encode('utf-8')
        if len(pwd_bytes) > 72:
            pwd_bytes = pwd_bytes[:72]
        return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode('utf-8')

    def register_account(self, username, password, mssv=None, role='sinh_vien'):
        """Đăng ký tài khoản người dùng mới"""
        conn = self.get_connection()
        try:
            pw_hash = self.hash_password(password)
            with conn.cursor() as cursor:
                # 1. Thêm account
                cursor.execute(
                    "INSERT INTO accounts (username, password_hash, role, is_active) VALUES (%s, %s, %s, True)",
                    (username.strip().lower(), pw_hash, role)
                )
                acc_id = cursor.lastrowid
                
                # 2. Nếu có mssv, cập nhật account_id cho sinh viên trong user_profiles
                if mssv:
                    cursor.execute("""
                        UPDATE user_profiles p
                        JOIN students s ON s.profile_id = p.profile_id
                        SET p.account_id = %s 
                        WHERE s.student_id = %s
                    """, (acc_id, mssv))
            conn.commit()
            return True
        except Exception as e:
            print(f"Loi dang ky tai khoan: {e}")
            return False
        finally:
            conn.close()

    def authenticate_user(self, username, password):
        """Xác thực tài khoản và trả về thông tin người dùng"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT tk.username, tk.role, s.student_id, p.full_name, s.administrative_class,
                           tk.password_hash, tk.is_active
                    FROM accounts tk
                    LEFT JOIN user_profiles p ON tk.account_id = p.account_id
                    LEFT JOIN students s ON p.profile_id = s.profile_id
                    WHERE tk.username = %s AND tk.is_active = True
                """, (username.strip().lower(),))
                row = cursor.fetchone()
                if not row:
                    return None
                stored_hash = row[5] or ""
                import bcrypt
                try:
                    valid = bcrypt.checkpw(password.encode('utf-8')[:72], stored_hash.encode('utf-8'))
                except (ValueError, TypeError):
                    # Hỗ trợ hash sha256 legacy
                    import hashlib
                    valid = hashlib.sha256(password.encode('utf-8')).hexdigest() == stored_hash
                if not valid:
                    return None
                return {
                    "username": row[0],
                    "role": row[1],
                    "mssv": row[2],
                    "ho_ten": row[3],
                    "lop_base": row[4]
                }
        except Exception as e:
            print(f"Loi xac thuc nguoi dung: {e}")
            return None
        finally:
            conn.close()
