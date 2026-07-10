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
                        dia_chi VARCHAR(200)
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
                    ("dia_chi", "VARCHAR(200)")
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
                        PRIMARY KEY (ma_lop_tc, mssv),
                        FOREIGN KEY (ma_lop_tc) REFERENCES lop_tin_chi(ma_lop_tc) ON DELETE CASCADE,
                        FOREIGN KEY (mssv) REFERENCES sinh_vien(mssv) ON DELETE CASCADE
                    ) ENGINE=InnoDB;
                """)
                
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
                            dan_toc, ton_giao, noi_sinh, quoc_tich, email, dia_chi
                        ) VALUES (
                            'N22DCCN134', 'Nguyễn Lê Nhật Huy', 'D22CQCNPM02-N', '19/08/2004', 'Nam', 
                            '0814117674', '054204002126', 'Kinh', 'Phật Giáo', 'Phú Yên', 
                            'Việt Nam', 'n22dccn134@student.ptithcm.edu.vn', 
                            'Tập Đoàn 24, Thôn Nguyên Cam, Xã Sơn Hòa, Tỉnh Đắk Lắk'
                        )
                    """)

                # Tự động chèn tài khoản mặc định n22dccn134 nếu chưa tồn tại
                cursor.execute("SELECT COUNT(*) FROM tai_khoan WHERE username = 'n22dccn134'")
                if cursor.fetchone()[0] == 0:
                    pw_hash = hashlib.sha256("123456".encode()).hexdigest()
                    cursor.execute("""
                        INSERT INTO tai_khoan (username, password_hash, mssv, role)
                        VALUES ('n22dccn134', %s, 'N22DCCN134', 'sinh_vien')
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

    def log_diem_danh(self, mssv, ma_buoi_hoc, trang_thai="Co mat"):
        conn = self.get_connection()
        try:
            with conn.cursor() as cursor:
                cursor.execute(
                    "INSERT INTO lich_su_diem_danh (mssv, ma_buoi_hoc, trang_thai) VALUES (%s, %s, %s)",
                    (mssv, ma_buoi_hoc, trang_thai)
                )
            conn.commit()
            return True
        except Exception as e:
            print(f"Loi ghi nhan diem danh: {e}")
            return False
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
