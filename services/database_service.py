import pymysql
import os
import numpy as np
import hashlib
from config.settings import settings

class DatabaseService:
    def __init__(self):
        self.db_config = settings.database
        self.host = self.db_config.get("host", "127.0.0.1")
        self.port = int(self.db_config.get("port", 3306))
        self.user = self.db_config.get("user", "root")
        self.password = self.db_config.get("password", "")
        self.db_name = self.db_config.get("db_name", "ptit_diem_danh")
        
        # Đảm bảo tạo database và các bảng nếu chưa tồn tại
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
        """Khởi tạo các bảng MySQL nếu chưa tồn tại"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                # 1. Bảng sinh viên (Mở rộng thêm các trường thông tin cá nhân)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS sinh_vien (
                        mssv VARCHAR(20) PRIMARY KEY,
                        ho_ten VARCHAR(100) NOT NULL,
                        lop_base VARCHAR(50),
                        face_vector TEXT,
                        ngay_sinh VARCHAR(20),
                        gioi_tinh VARCHAR(10),
                        sdt VARCHAR(20),
                        cccd VARCHAR(20),
                        dan_toc VARCHAR(20),
                        ton_giao VARCHAR(20),
                        noi_sinh VARCHAR(50),
                        quoc_tich VARCHAR(50),
                        email VARCHAR(100),
                        dia_chi VARCHAR(200),
                        trang_thai_ho_so VARCHAR(20) DEFAULT 'Pending',
                        ngay_cap_nhat_anh DATETIME DEFAULT CURRENT_TIMESTAMP
                    ) ENGINE=InnoDB;
                """)
                
                # Di chuyển nâng cấp cột phòng hờ nếu bảng cũ đã tồn tại trước đó
                for col, col_type in [
                    ("ngay_sinh", "VARCHAR(20)"),
                    ("gioi_tinh", "VARCHAR(10)"),
                    ("sdt", "VARCHAR(20)"),
                    ("cccd", "VARCHAR(20)"),
                    ("dan_toc", "VARCHAR(20)"),
                    ("ton_giao", "VARCHAR(20)"),
                    ("noi_sinh", "VARCHAR(50)"),
                    ("quoc_tich", "VARCHAR(50)"),
                    ("email", "VARCHAR(100)"),
                    ("dia_chi", "VARCHAR(200)"),
                    ("trang_thai_ho_so", "VARCHAR(20) DEFAULT 'Pending'"),
                    ("ngay_cap_nhat_anh", "DATETIME DEFAULT CURRENT_TIMESTAMP")
                ]:
                    try:
                        cursor.execute(f"ALTER TABLE sinh_vien ADD COLUMN {col} {col_type};")
                    except Exception:
                        pass
                
                # 2. Bảng môn học
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS mon_hoc (
                        ma_mon VARCHAR(20) PRIMARY KEY,
                        ten_mon VARCHAR(100) NOT NULL
                    ) ENGINE=InnoDB;
                """)
                
                # 3. Bảng lớp tín chỉ
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS lop_tin_chi (
                        ma_lop_tc VARCHAR(50) PRIMARY KEY,
                        ma_mon VARCHAR(20),
                        FOREIGN KEY (ma_mon) REFERENCES mon_hoc(ma_mon) ON DELETE CASCADE
                    ) ENGINE=InnoDB;
                """)
                
                # 4. Bảng trung gian Sinh viên - Lớp tín chỉ
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS sinh_vien_lop_tin_chi (
                        ma_lop_tc VARCHAR(50),
                        mssv VARCHAR(20),
                        trang_thai_hoc_tap VARCHAR(20) DEFAULT 'Active', -- Active, Cam thi
                        PRIMARY KEY (ma_lop_tc, mssv),
                        FOREIGN KEY (ma_lop_tc) REFERENCES lop_tin_chi(ma_lop_tc) ON DELETE CASCADE,
                        FOREIGN KEY (mssv) REFERENCES sinh_vien(mssv) ON DELETE CASCADE
                    ) ENGINE=InnoDB;
                """)
                try:
                    cursor.execute("ALTER TABLE sinh_vien_lop_tin_chi ADD COLUMN trang_thai_hoc_tap VARCHAR(20) DEFAULT 'Active';")
                except Exception:
                    pass
                
                # 5. Bảng lịch học chi tiết
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS lich_hoc_chi_tiet (
                        ma_buoi_hoc INT AUTO_INCREMENT PRIMARY KEY,
                        ma_lop_tc VARCHAR(50),
                        ngay_hoc DATE NOT NULL,
                        phong_hoc VARCHAR(20) NOT NULL,
                        gio_bat_dau TIME NOT NULL,
                        FOREIGN KEY (ma_lop_tc) REFERENCES lop_tin_chi(ma_lop_tc) ON DELETE CASCADE
                    ) ENGINE=InnoDB;
                """)
                
                # 6. Bảng lịch sử điểm danh
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS lich_su_diem_danh (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        mssv VARCHAR(20),
                        ma_buoi_hoc INT,
                        thoi_gian_quet DATETIME DEFAULT CURRENT_TIMESTAMP,
                        trang_thai VARCHAR(20),
                        nguoi_xac_nhan VARCHAR(50) DEFAULT 'AI',
                        FOREIGN KEY (mssv) REFERENCES sinh_vien(mssv) ON DELETE CASCADE,
                        FOREIGN KEY (ma_buoi_hoc) REFERENCES lich_hoc_chi_tiet(ma_buoi_hoc) ON DELETE CASCADE
                    ) ENGINE=InnoDB;
                """)
                try:
                    cursor.execute("ALTER TABLE lich_su_diem_danh ADD COLUMN nguoi_xac_nhan VARCHAR(50) DEFAULT 'AI';")
                except Exception:
                    pass

                # 6.1. Bảng đơn xin nghỉ phép
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS don_xin_phep (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        mssv VARCHAR(20),
                        ma_buoi_hoc INT,
                        ly_do TEXT,
                        minh_chung VARCHAR(255),
                        trang_thai VARCHAR(20) DEFAULT 'Pending',
                        nguoi_duyet VARCHAR(50),
                        FOREIGN KEY (mssv) REFERENCES sinh_vien(mssv) ON DELETE CASCADE,
                        FOREIGN KEY (ma_buoi_hoc) REFERENCES lich_hoc_chi_tiet(ma_buoi_hoc) ON DELETE CASCADE
                    ) ENGINE=InnoDB;
                """)
                
                # 7. Bảng tài khoản người dùng
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS tai_khoan (
                        username VARCHAR(50) PRIMARY KEY,
                        password_hash VARCHAR(255) NOT NULL,
                        mssv VARCHAR(20) UNIQUE,
                        role VARCHAR(20) DEFAULT 'sinh_vien',
                        FOREIGN KEY (mssv) REFERENCES sinh_vien(mssv) ON DELETE SET NULL
                    ) ENGINE=InnoDB;
                """)
                
                # Tự động chèn thông tin sinh viên mặc định N22DCCN134 nếu chưa tồn tại
                cursor.execute("SELECT COUNT(*) FROM sinh_vien WHERE mssv = 'N22DCCN134'")
                if cursor.fetchone()[0] == 0:
                    cursor.execute("""
                        INSERT INTO sinh_vien (
                            mssv, ho_ten, lop_base, ngay_sinh, gioi_tinh, sdt, cccd, 
                            dan_toc, ton_giao, noi_sinh, quoc_tich, email, dia_chi, trang_thai_ho_so
                        ) VALUES (
                            'N22DCCN134', 'Nguyễn Lê Nhật Huy', 'D22CQCNPM02-N', '19/08/2004', 'Nam', 
                            '0814117674', '054204002126', 'Kinh', 'Phật Giáo', 'Phú Yên', 
                            'Việt Nam', 'n22dccn134@student.ptithcm.edu.vn', 
                            'Tập Đoàn 24, Thôn Nguyên Cam, Xã Sơn Hòa, Tỉnh Đắk Lắk', 'Approved'
                        )
                    """)
                else:
                    cursor.execute("UPDATE sinh_vien SET trang_thai_ho_so = 'Approved' WHERE mssv = 'N22DCCN134'")

                # Tự động chèn tài khoản mặc định n22dccn134 nếu chưa tồn tại
                cursor.execute("SELECT COUNT(*) FROM tai_khoan WHERE username = 'n22dccn134'")
                if cursor.fetchone()[0] == 0:
                    pw_hash = hashlib.sha256("123456".encode()).hexdigest()
                    cursor.execute("""
                        INSERT INTO tai_khoan (username, password_hash, mssv, role)
                        VALUES ('n22dccn134', %s, 'N22DCCN134', 'sinh_vien')
                    """, (pw_hash,))
                    
                # Tự động chèn tài khoản giảng viên mặc định để kiểm thử gv1 / 123456
                cursor.execute("SELECT COUNT(*) FROM tai_khoan WHERE username = 'gv1'")
                if cursor.fetchone()[0] == 0:
                    pw_hash = hashlib.sha256("123456".encode()).hexdigest()
                    cursor.execute("""
                        INSERT INTO tai_khoan (username, password_hash, mssv, role)
                        VALUES ('gv1', %s, NULL, 'giang_vien')
                    """, (pw_hash,))

                # Tự động chèn tài khoản admin admin / 123456
                cursor.execute("SELECT COUNT(*) FROM tai_khoan WHERE username = 'admin'")
                if cursor.fetchone()[0] == 0:
                    pw_hash = hashlib.sha256("123456".encode()).hexdigest()
                    cursor.execute("""
                        INSERT INTO tai_khoan (username, password_hash, mssv, role)
                        VALUES ('admin', %s, NULL, 'admin')
                    """, (pw_hash,))

            conn.commit()
        except Exception as e:
            print(f"Loi khoi tao cau truc bang MySQL: {e}")
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
            vector_str = self.vector_to_string(face_vector)
            with conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO sinh_vien (
                        mssv, ho_ten, lop_base, face_vector, ngay_sinh, gioi_tinh, sdt, cccd, 
                        dan_toc, ton_giao, noi_sinh, quoc_tich, email, dia_chi
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE 
                        ho_ten=VALUES(ho_ten), 
                        lop_base=VALUES(lop_base), 
                        face_vector=COALESCE(NULLIF(VALUES(face_vector), ''), face_vector),
                        ngay_sinh=VALUES(ngay_sinh),
                        gioi_tinh=VALUES(gioi_tinh),
                        sdt=VALUES(sdt),
                        cccd=VALUES(cccd),
                        dan_toc=VALUES(dan_toc),
                        ton_giao=VALUES(ton_giao),
                        noi_sinh=VALUES(noi_sinh),
                        quoc_tich=VALUES(quoc_tich),
                        email=VALUES(email),
                        dia_chi=VALUES(dia_chi)
                """, (
                    mssv, ho_ten, lop_base, vector_str, ngay_sinh, gioi_tinh, sdt, cccd, 
                    dan_toc, ton_giao, noi_sinh, quoc_tich, email, dia_chi
                ))
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
                    SELECT ho_ten, lop_base, face_vector, ngay_sinh, gioi_tinh, sdt, cccd, 
                           dan_toc, ton_giao, noi_sinh, quoc_tich, email, dia_chi 
                    FROM sinh_vien WHERE mssv = %s
                """, (mssv,))
                row = cursor.fetchone()
                if row:
                    return {
                        "mssv": mssv,
                        "ho_ten": row[0],
                        "lop_base": row[1],
                        "face_vector": self.string_to_vector(row[2]),
                        "ngay_sinh": row[3],
                        "gioi_tinh": row[4],
                        "sdt": row[5],
                        "cccd": row[6],
                        "dan_toc": row[7],
                        "ton_giao": row[8],
                        "noi_sinh": row[9],
                        "quoc_tich": row[10],
                        "email": row[11],
                        "dia_chi": row[12]
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
                    SELECT mssv, ho_ten, lop_base, face_vector, ngay_sinh, gioi_tinh, sdt, cccd, 
                           dan_toc, ton_giao, noi_sinh, quoc_tich, email, dia_chi 
                    FROM sinh_vien
                """)
                rows = cursor.fetchall()
                result = []
                for r in rows:
                    result.append({
                        "mssv": r[0],
                        "ho_ten": r[1],
                        "lop_base": r[2],
                        "face_vector": self.string_to_vector(r[3]),
                        "ngay_sinh": r[4],
                        "gioi_tinh": r[5],
                        "sdt": r[6],
                        "cccd": r[7],
                        "dan_toc": r[8],
                        "ton_giao": r[9],
                        "noi_sinh": r[10],
                        "quoc_tich": r[11],
                        "email": r[12],
                        "dia_chi": r[13]
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
                cursor.execute("REPLACE INTO mon_hoc (ma_mon, ten_mon) VALUES (%s, %s)", (ma_mon, ten_mon))
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
                cursor.execute("REPLACE INTO lop_tin_chi (ma_lop_tc, ma_mon) VALUES (%s, %s)", (ma_lop_tc, ma_mon))
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
                cursor.execute("REPLACE INTO sinh_vien_lop_tin_chi (ma_lop_tc, mssv) VALUES (%s, %s)", (ma_lop_tc, mssv))
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
                    "INSERT INTO lich_hoc_chi_tiet (ma_lop_tc, ngay_hoc, phong_hoc, gio_bat_dau) VALUES (%s, %s, %s, %s)",
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
                    "SELECT id FROM lich_su_diem_danh WHERE mssv = %s AND ma_buoi_hoc = %s",
                    (mssv, ma_buoi_hoc)
                )
                row = cursor.fetchone()
                if row:
                    cursor.execute(
                        "UPDATE lich_su_diem_danh SET trang_thai = %s, nguoi_xac_nhan = %s, thoi_gian_quet = CURRENT_TIMESTAMP WHERE id = %s",
                        (trang_thai, nguoi_xac_nhan, row[0])
                    )
                else:
                    cursor.execute(
                        "INSERT INTO lich_su_diem_danh (mssv, ma_buoi_hoc, trang_thai, nguoi_xac_nhan) VALUES (%s, %s, %s, %s)",
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
        """Duyệt hồ sơ khuôn mặt sinh viên"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "UPDATE sinh_vien SET trang_thai_ho_so = 'Approved', ngay_cap_nhat_anh = CURRENT_TIMESTAMP WHERE mssv = %s",
                    (mssv,)
                )
            conn.commit()
            return True
        except Exception as e:
            print(f"Loi duyet ho so: {e}")
            return False
        finally:
            conn.close()

    def submit_leave_request(self, mssv, ma_buoi_hoc, ly_do, minh_chung):
        """Gửi đơn xin nghỉ phép"""
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO don_xin_phep (mssv, ma_buoi_hoc, ly_do, minh_chung) VALUES (%s, %s, %s, %s)",
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
                    SELECT dxp.id, dxp.mssv, sv.ho_ten, dxp.ma_buoi_hoc, lh.ngay_hoc, lh.gio_bat_dau, lh.ma_lop_tc,
                           dxp.ly_do, dxp.minh_chung, dxp.trang_thai, dxp.nguoi_duyet
                    FROM don_xin_phep dxp
                    JOIN sinh_vien sv ON dxp.mssv = sv.mssv
                    JOIN lich_hoc_chi_tiet lh ON dxp.ma_buoi_hoc = lh.ma_buoi_hoc
                """
                params = []
                if ma_lop_tc:
                    query += " WHERE lh.ma_lop_tc = %s"
                    params.append(ma_lop_tc)
                query += " ORDER BY dxp.id DESC"
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
                cursor.execute("SELECT mssv, ma_buoi_hoc FROM don_xin_phep WHERE id = %s", (request_id,))
                row = cursor.fetchone()
                if not row:
                    return False
                mssv, ma_buoi_hoc = row
                
                # Cập nhật trạng thái đơn nghỉ phép
                cursor.execute(
                    "UPDATE don_xin_phep SET trang_thai = 'Approved', nguoi_duyet = %s WHERE id = %s",
                    (nguoi_duyet, request_id)
                )
                
                # Ghi nhận/Cập nhật bảng điểm danh
                cursor.execute(
                    "SELECT id FROM lich_su_diem_danh WHERE mssv = %s AND ma_buoi_hoc = %s",
                    (mssv, ma_buoi_hoc)
                )
                att_row = cursor.fetchone()
                if att_row:
                    cursor.execute(
                        "UPDATE lich_su_diem_danh SET trang_thai = 'Có phép', nguoi_xac_nhan = %s, thoi_gian_quet = CURRENT_TIMESTAMP WHERE id = %s",
                        (nguoi_duyet, att_row[0])
                    )
                else:
                    cursor.execute(
                        "INSERT INTO lich_su_diem_danh (mssv, ma_buoi_hoc, trang_thai, nguoi_xac_nhan) VALUES (%s, %s, 'Có phép', %s)",
                        (mssv, ma_buoi_hoc, nguoi_duyet)
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
                    "UPDATE don_xin_phep SET trang_thai = 'Rejected', nguoi_duyet = %s WHERE id = %s",
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
                # 1. Lấy tất cả buổi học đã diễn ra cho lớp tín chỉ này
                cursor.execute("""
                    SELECT ma_buoi_hoc FROM lich_hoc_chi_tiet 
                    WHERE ma_lop_tc = %s AND (ngay_hoc < CURRENT_DATE OR (ngay_hoc = CURRENT_DATE AND gio_bat_dau <= CURRENT_TIME))
                """, (ma_lop_tc,))
                buoi_hoc_rows = cursor.fetchall()
                buoi_hoc_ids = [r[0] for r in buoi_hoc_rows]
                tong_buoi = len(buoi_hoc_ids)
                
                # 2. Lấy danh sách sinh viên đăng ký lớp
                cursor.execute("""
                    SELECT sv.mssv, sv.ho_ten, sv.lop_base 
                    FROM sinh_vien_lop_tin_chi sv_tc
                    JOIN sinh_vien sv ON sv_tc.mssv = sv.mssv
                    WHERE sv_tc.ma_lop_tc = %s
                """, (ma_lop_tc,))
                sinh_vien_list = cursor.fetchall()
                
                report = []
                for mssv, ho_ten, lop_base in sinh_vien_list:
                    # Đếm các trạng thái điểm danh
                    # Nếu chưa có log thì mặc định là Vắng không phép
                    dung_gio = 0
                    di_muon = 0
                    co_phep = 0
                    vang_kp = 0
                    
                    for ma_buoi in buoi_hoc_ids:
                        cursor.execute("""
                            SELECT trang_thai FROM lich_su_diem_danh 
                            WHERE mssv = %s AND ma_buoi_hoc = %s
                        """, (mssv, ma_buoi))
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
                            UPDATE sinh_vien_lop_tin_chi 
                            SET trang_thai_hoc_tap = 'Cam thi' 
                            WHERE ma_lop_tc = %s AND mssv = %s
                        """, (ma_lop_tc, mssv))
                    else:
                        cursor.execute("""
                            UPDATE sinh_vien_lop_tin_chi 
                            SET trang_thai_hoc_tap = 'Active' 
                            WHERE ma_lop_tc = %s AND mssv = %s
                        """, (ma_lop_tc, mssv))
                        
                    report.append({
                        "mssv": mssv,
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
        """Mã hóa mật khẩu bằng SHA-256"""
        return hashlib.sha256(password.encode()).hexdigest()

    def register_account(self, username, password, mssv=None, role='sinh_vien'):
        """Đăng ký tài khoản người dùng mới"""
        conn = self.get_connection()
        try:
            pw_hash = self.hash_password(password)
            with conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO tai_khoan (username, password_hash, mssv, role) VALUES (%s, %s, %s, %s)",
                    (username.strip().lower(), pw_hash, mssv, role)
                )
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
            pw_hash = self.hash_password(password)
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT tk.username, tk.role, tk.mssv, sv.ho_ten, sv.lop_base 
                    FROM tai_khoan tk
                    LEFT JOIN sinh_vien sv ON tk.mssv = sv.mssv
                    WHERE tk.username = %s AND tk.password_hash = %s
                """, (username.strip().lower(), pw_hash))
                row = cursor.fetchone()
                if row:
                    return {
                        "username": row[0],
                        "role": row[1],
                        "mssv": row[2],
                        "ho_ten": row[3],
                        "lop_base": row[4]
                    }
                return None
        except Exception as e:
            print(f"Loi xac thuc nguoi dung: {e}")
            return None
        finally:
            conn.close()
