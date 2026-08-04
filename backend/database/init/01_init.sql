-- =========================================================================
-- 0. XÓA DATABASE CŨ VÀ TẠO LẠI (CLEAN SLATE)
-- =========================================================================
DROP DATABASE IF EXISTS ptit_diem_danh;
CREATE DATABASE ptit_diem_danh;
ALTER DATABASE ptit_diem_danh CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ptit_diem_danh;


-- TẮT KIỂM TRA KHÓA NGOẠI
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Bảng accounts
CREATE TABLE accounts (
    account_id INT AUTO_INCREMENT PRIMARY KEY,        -- KHÓA CHÍNH: Mã tài khoản tự tăng
    username VARCHAR(100) UNIQUE NOT NULL,            -- Tên đăng nhập (Độ dài lớn hơn để chứa email hoặc mã SV dài)
    password_hash VARCHAR(255) NOT NULL,              -- Chuỗi mật khẩu đã băm (Bcrypt/Argon2)
    role VARCHAR(20) NOT NULL,                        -- Vai trò phân quyền (VD: 'admin', 'lecturer', 'student')
    
    is_active BOOLEAN DEFAULT TRUE,                   -- Trạng thái: TRUE (Hoạt động), FALSE (Đã bị khóa/Thôi học)
    failed_login_attempts INT DEFAULT 0,              -- Số lần nhập sai mật khẩu liên tục (Phòng chống Brute-force)
    lock_until DATETIME NULL,                         -- Thời điểm hết hạn khóa tạm thời nếu nhập sai quá số lần quy định
    
    last_login DATETIME NULL,                         -- Thời điểm đăng nhập gần nhất
    refresh_token TEXT NULL,                          -- Lưu chuỗi Refresh Token (Dùng kiểu TEXT vì token rất dài)
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Thời điểm tạo tài khoản
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP -- Thời điểm cập nhật thông tin gần nhất
);

-- =========================================================================
-- BẢNG 1: USER_PROFILES (Hồ sơ nhân thân dùng chung cho mọi vai trò)
-- =========================================================================
CREATE TABLE user_profiles (
    profile_id INT AUTO_INCREMENT PRIMARY KEY,        -- KHÓA CHÍNH: Mã định danh hồ sơ duy nhất tự động tăng
    account_id INT UNIQUE,                            -- KHÓA NGOẠI (1-1): Liên kết với bảng accounts (Mã tài khoản đăng nhập)
    
    full_name VARCHAR(100) NOT NULL,                  -- Họ và tên đầy đủ
    date_of_birth DATE,                               -- Ngày tháng năm sinh
    gender VARCHAR(10),                               -- Giới tính (Nam/Nữ)
    citizen_id VARCHAR(20) UNIQUE,                    -- Số CMND/Căn cước công dân (Độc nhất)
    ethnicity VARCHAR(50),                            -- Dân tộc (VD: Kinh, Hoa...)
    religion VARCHAR(50),                             -- Tôn giáo (VD: Không, Phật giáo...)
    nationality VARCHAR(50) DEFAULT 'Việt Nam',       -- Quốc tịch (Mặc định là Việt Nam)
    phone_number VARCHAR(15),                         -- Số điện thoại liên lạc
    personal_email VARCHAR(100),                      -- Email cá nhân (Khác với email trường cấp)
    address TEXT,                                     -- Địa chỉ thường trú/tạm trú
    place_of_birth VARCHAR(100),                      -- Nơi sinh
    avatar_url VARCHAR(255),                          -- Đường dẫn lưu ảnh đại diện/ảnh thẻ
    
    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE SET NULL
);

-- ==================================================================
-- BẢNG 5: CLASSROOMS (Thông tin các phòng học)
-- ==================================================================
CREATE TABLE classrooms (
    -- Khóa chính
    room_id         VARCHAR(20)  PRIMARY KEY,       -- VD: PH2026001

    -- Vị trí & Định danh
    campus          VARCHAR(100) NOT NULL,          -- Cơ sở (VD: CS Tăng Nhơn Phú, CS Quận 1)
    building        VARCHAR(50)  NOT NULL,          -- Tòa nhà (VD: A, B, Trung tâm)
    room_number     VARCHAR(20)  NOT NULL,          -- Số thứ tự/Số phòng (VD: 101, 102)
    room_name       VARCHAR(100) NOT NULL,          -- Tên phòng (Sẽ được Backend ghép: Tòa nhà + Số phòng)
    notes           VARCHAR(255) NULL,              -- Ghi chú

    -- Camera giám sát
    camera_rtsp_url VARCHAR(255) NULL,
    camera_status   VARCHAR(20)  DEFAULT 'Online',  -- Trạng thái: Online / Offline / Defective

    -- Quản lý sức chứa và phân loại
    capacity        INT          DEFAULT 50,
    room_type       VARCHAR(50)  DEFAULT 'Theory',  -- Loại phòng: Theory / Computer_Lab / Specialized_Lab

    -- Quản lý trạng thái
    status          VARCHAR(20)  DEFAULT 'Active'   -- Trạng thái: Active / Maintenance
);
-- ==================================================================
-- BẢNG 6: SUBJECTS (Thông tin môn học)
-- ==================================================================
CREATE TABLE subjects (
    subject_id VARCHAR(20) PRIMARY KEY,                   -- KHÓA CHÍNH: Mã môn học (VD: INT1152)
    subject_name VARCHAR(150) NOT NULL,                   -- Tên môn học (VD: Nhập môn Lập trình)
    
    theory_credits INT DEFAULT 0,                         -- Số tín chỉ lý thuyết
    practical_credits INT DEFAULT 0,                      -- Số tín chỉ thực hành
    credits INT GENERATED ALWAYS AS (theory_credits + practical_credits) STORED,                                -- Tổng tín chỉ (sẽ được trigger cập nhật)
    

    -- TỰ ĐỘNG TÍNH SỐ TIẾT HỌC DỰA TRÊN TÍN CHỈ
    theory_periods INT GENERATED ALWAYS AS (theory_credits * 15) STORED,
    practical_periods INT GENERATED ALWAYS AS (practical_credits * 45) STORED,
    total_periods INT GENERATED ALWAYS AS ((theory_credits * 15) + (practical_credits * 45)) STORED,

    faculty_id VARCHAR(20),                         -- Khoa/Bộ môn phụ trách
    is_active BOOLEAN DEFAULT TRUE,                        -- Trạng thái môn học

    FOREIGN KEY (faculty_id) REFERENCES faculties(faculty_id) ON DELETE SET NULL
);

-- ==================================================================
-- BẢNG 6.5: SEMESTERS (Khung thời gian các học kỳ)
-- ==================================================================
CREATE TABLE semesters (
    semester_id VARCHAR(20) PRIMARY KEY,                  -- ID học kỳ (VD: 2024_2025_1)
    academic_year VARCHAR(20) NOT NULL,                   -- Niên khóa (VD: 2024-2025)
    semester_number INT NOT NULL,                         -- Học kỳ (1, 2, 3)
    
    start_date DATE NOT NULL,                             -- Ngày bắt đầu học kỳ
    end_date DATE NOT NULL,                               -- Ngày kết thúc học kỳ
    
    status VARCHAR(20) DEFAULT 'Upcoming',                -- Trạng thái: Upcoming, Active, Completed
    
    CONSTRAINT chk_semester_dates CHECK (end_date > start_date)
);

-- Dữ liệu mẫu (Hệ thống sẽ lấy range ngày ở đây để tự động rải lịch)
-- Học kỳ 1: 10/08 -> 31/12
-- Học kỳ 2: 01/01 -> 31/05
-- Học kỳ 3 (Hè): 01/06 -> 09/08

-- ==================================================================
-- BẢNG 4: ADMINISTRATIVE_CLASSES (Lớp hành chính / Lớp biên chế)
-- ==================================================================
CREATE TABLE administrative_classes (
    class_id VARCHAR(50) PRIMARY KEY,                 -- KHÓA CHÍNH: Mã lớp (VD: D22CQCNMT01-N)
    class_name VARCHAR(100) NOT NULL,                 -- Tên lớp (Thường trùng mã lớp hoặc ghi rõ hơn)
    
    faculty_id VARCHAR(20),                    -- Khoa quản lý (VD: Khoa CNTT 2)
    major_id VARCHAR(20),                      -- Ngành học (VD: Công nghệ thông tin)
    cohort VARCHAR(20) NOT NULL,                      -- Khóa học / Niên khóa (VD: D22 / 2022-2027)
    
    advisor_id VARCHAR(20) NULL,                      -- KHÓA NGOẠI: Cố vấn học tập / GVCN
    
    status VARCHAR(20) DEFAULT 'Active',              -- Trạng thái: 'Active' (Đang học), 'Graduated' (Đã tốt nghiệp)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (advisor_id) REFERENCES lecturers(lecturer_id) ON DELETE SET NULL,
    FOREIGN KEY (faculty_id) REFERENCES faculties(faculty_id) ON DELETE SET NULL,
    FOREIGN KEY (major_id) REFERENCES majors(major_id) ON DELETE SET NULL
);

-- =========================================================================
-- BẢNG 3: LECTURERS (Thông tin công tác riêng của Giảng viên)
-- =========================================================================
CREATE TABLE lecturers (
    lecturer_id VARCHAR(20) PRIMARY KEY,              -- KHÓA CHÍNH: Mã định danh giảng viên
    profile_id INT UNIQUE NOT NULL,                   -- KHÓA NGOẠI (1-1): Liên kết với bảng user_profiles (Lấy thông tin cá nhân)
    
    faculty_id VARCHAR(20),                           -- Khoa/Bộ môn trực thuộc (VD: Bộ môn Khoa học Máy tính)
    academic_title VARCHAR(50),                       -- Học hàm, học vị (VD: ThS, TS, PGS...)

    position VARCHAR(100),                            -- Chức vụ quản lý (VD: Trưởng bộ môn, Giảng viên)
    employment_type VARCHAR(50),                      -- Hình thức công tác (Cơ hữu, Thỉnh giảng, Trợ giảng)
    teaching_status VARCHAR(50) DEFAULT 'Active',     -- Trạng thái (Active, On_Leave, Retired, Resigned)
    hire_date DATE,                                   -- Ngày bắt đầu công tác tại trường
    
    FOREIGN KEY (profile_id) REFERENCES user_profiles(profile_id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES faculties(faculty_id) ON DELETE SET NULL
);


-- =========================================================================
-- BẢNG 2: STUDENTS (Thông tin học thuật riêng của Sinh viên)
-- =========================================================================
CREATE TABLE students (
    student_id VARCHAR(20) PRIMARY KEY,               -- KHÓA CHÍNH: Mã số sinh viên (VD: N22DCCN160)
    profile_id INT UNIQUE NOT NULL,                   -- KHÓA NGOẠI (1-1): Liên kết với bảng user_profiles (Lấy thông tin cá nhân)
    
    administrative_class_id VARCHAR(50),                -- Lớp hành chính (VD: D22CQCNMT01-N)
    major_id VARCHAR(20),                               -- Ngành học (VD: Công nghệ thông tin)
    specialization VARCHAR(100),                      -- Chuyên ngành (VD: Công nghệ phần mềm)
    faculty_id VARCHAR(20),                          -- Khoa quản lý (VD: Khoa CNTT 2)
    cohort VARCHAR(20),                               -- Niên khóa (VD: 2022-2027)
    training_program VARCHAR(50),                     -- Hệ đào tạo / Bậc đào tạo (VD: Đại học Chính quy)
    academic_status VARCHAR(50),                      -- Trạng thái học tập (VD: Đang học, Bảo lưu, Đã tốt nghiệp)
    
    FOREIGN KEY (profile_id) REFERENCES user_profiles(profile_id) ON DELETE CASCADE,
    FOREIGN KEY (administrative_class_id) REFERENCES administrative_classes(class_id) ON DELETE SET NULL,   -- Tạo liên kết khóa ngoại với bảng administrative_classes

    FOREIGN KEY (faculty_id) REFERENCES faculties(faculty_id) ON DELETE SET NULL,
    FOREIGN KEY (major_id) REFERENCES majors(major_id) ON DELETE SET NULL
);

-- Bảng face_features (LONGBLOB để lưu mảng Float32)
CREATE TABLE face_features (
    feature_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    face_vector LONGBLOB NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    model_version VARCHAR(50) DEFAULT 'buffalo_l', -- Lưu phiên bản mô hình AI (Để tương thích khi nâng cấp sau này)
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

-- ==================================================================
-- BẢNG 7: CREDIT_CLASSES (Lớp học tín chỉ)
-- ==================================================================
CREATE TABLE credit_classes (
    class_id VARCHAR(50) PRIMARY KEY,                                                       -- KHÓA CHÍNH: ID tự động
    parent_class_id VARCHAR(50) NULL,             -- ĐÃ THÊM: Liên kết Tổ (Con) với Nhóm (Cha)

    subject_id VARCHAR(20) NOT NULL,                                                        -- KHÓA NGOẠI: Liên kết với bảng subjects (Môn học)
    lecturer_id VARCHAR(20) NOT NULL,                                                       -- KHÓA NGOẠI: Liên kết với bảng lecturers (Giảng viên)
    semester_id VARCHAR(20) NOT NULL,                                                                  -- Học kỳ (VD: 1, 2, 3, Hè)

    class_group VARCHAR(20) NULL,                                                           -- Nhóm/Tổ (VD: Môn CSDL có Lớp chung 01, nhưng chia Tổ TH 1, 2, 3)
    class_type VARCHAR(20) DEFAULT 'Combined',    -- ĐÃ THÊM: 'Theory', 'Practice', 'Combined'
    start_week INT NULL,                          -- ĐÃ THÊM: Tuần bắt đầu học
    end_week INT NULL,                            -- ĐÃ THÊM: Tuần kết thúc học

    max_students INT DEFAULT 50,                                                            -- Sĩ số tối đa cho phép đăng ký
    current_students INT DEFAULT 0,                                                         -- Sĩ số hiện tại (Giúp truy vấn nhanh không cần COUNT bảng enrollments)
    status VARCHAR(20) DEFAULT 'Active',                                                    -- Trạng thái lớp: 'Planning' (Dự kiến), 'Active' (Đang học), 'Completed' (Đã xong), 'Cancelled' (Bị hủy do ít SV)

    FOREIGN KEY (parent_class_id) REFERENCES credit_classes(class_id) ON DELETE CASCADE, -- Khóa ngoại tự chiếu
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE,         -- KHÓA NGOẠI: Liên kết với bảng subjects (Môn học)
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(lecturer_id) ON DELETE CASCADE,      -- KHÓA NGOẠI: Liên kết với bảng lecturers (Giảng viên)
    FOREIGN KEY (semester_id) REFERENCES semesters(semester_id) ON DELETE CASCADE       -- KHÓA NGOẠI: Liên kết với bảng semesters (Học kỳ)

);

-- ==================================================================
-- BẢNG TRUNG GIAN: Phân luồng Lớp Biên Chế nào được học Nhóm Tín Chỉ nào
-- ==================================================================
CREATE TABLE class_target_audiences (
    target_id INT AUTO_INCREMENT PRIMARY KEY,
    class_id VARCHAR(50) NOT NULL,                    -- KHÓA NGOẠI: Mã Nhóm tín chỉ (VD: INT1152_01)
    administrative_class_id VARCHAR(50) NOT NULL,     -- KHÓA NGOẠI: Mã Lớp biên chế (VD: D22CQCNMT01-N)
    
    FOREIGN KEY (class_id) REFERENCES credit_classes(class_id) ON DELETE CASCADE,
    FOREIGN KEY (administrative_class_id) REFERENCES administrative_classes(class_id) ON DELETE CASCADE,
    
    CONSTRAINT uc_class_target UNIQUE (class_id, administrative_class_id) -- Chống thêm trùng lặp
);

-- ==================================================================
-- BẢNG MỚI: LECTURER_BUSY_TIMES (Lịch bận/không thể dạy của GV)
-- ==================================================================
CREATE TABLE lecturer_busy_times (
    busy_id INT AUTO_INCREMENT PRIMARY KEY,
    lecturer_id VARCHAR(20) NOT NULL,                     -- KHÓA NGOẠI: Mã giảng viên
    semester_id VARCHAR(20) NOT NULL,                     -- KHÓA NGOẠI: Áp dụng cho học kỳ nào
    
    day_of_week INT NOT NULL,                             -- Thứ trong tuần (2 -> 8)
    start_shift INT NOT NULL,                             -- Tiết bắt đầu (VD: 1 cho Ca Sáng, 5 cho Ca Chiều)
    end_shift INT NOT NULL,                               -- Tiết kết thúc (VD: 4 cho Ca Sáng, 8 cho Ca Chiều)
    
    notes VARCHAR(255) NULL,                              -- Ghi chú (VD: "Bận họp công ty ngoài", "Đi công tác")
    
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(lecturer_id) ON DELETE CASCADE,
    CONSTRAINT chk_busy_day_of_week CHECK (day_of_week BETWEEN 2 AND 8),
    CONSTRAINT chk_busy_shifts CHECK (end_shift >= start_shift AND start_shift > 0)
);

-- ==================================================================
-- BẢNG MỚI: CLASS_SCHEDULES (Thời khóa biểu định kỳ)
-- ==================================================================
CREATE TABLE class_schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,               -- ID Tự động
    class_id VARCHAR(50) NOT NULL,                            -- Thuộc lớp tín chỉ nào
    room_id VARCHAR(20) NOT NULL,                             -- Học ở phòng nào
    
    day_of_week INT NOT NULL,                                 -- Thứ trong tuần (2 -> 8, với 8 là Chủ Nhật)
    start_shift INT NOT NULL,                                 -- Tiết bắt đầu (VD: 1)
    end_shift INT NOT NULL,                                   -- Tiết kết thúc (VD: 3)
    
    session_type VARCHAR(20) DEFAULT 'Theory', 
    
    FOREIGN KEY (class_id) REFERENCES credit_classes(class_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES classrooms(room_id) ON DELETE RESTRICT,
    
    -- Ràng buộc dữ liệu cơ bản
    CONSTRAINT chk_day_of_week CHECK (day_of_week BETWEEN 2 AND 8),
    CONSTRAINT chk_shifts CHECK (end_shift >= start_shift AND start_shift > 0)
);

-- ==================================================================
-- BẢNG 8: CLASS_ENROLLMENTS (Bảng trung gian N-N), đăng ký môn học của sinh viên vào lớp tín chỉ
-- ==================================================================
CREATE TABLE class_enrollments (
    class_id VARCHAR(50) NOT NULL,                                                          -- KHÓA NGOẠI: Liên kết với bảng credit_classes (Lớp học tín chỉ)
    student_id VARCHAR(20) NOT NULL,                                                        -- KHÓA NGOẠI: Liên kết với bảng students (Sinh viên)
    enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,                                   -- Ngày đăng ký học

    status VARCHAR(20) DEFAULT 'Enrolled',                                                  -- Trạng thái: 'Enrolled' (Đang học), 'Dropped' (Đã rút bớt/Hủy)
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,                                        -- Lưu thời điểm thay đổi trạng thái
    
    PRIMARY KEY (class_id, student_id),                                                     -- KHÓA CHÍNH: Kết hợp từ class_id và student_id (Không thể có 1 SV học 2 lần cùng 1 lớp)
    FOREIGN KEY (class_id) REFERENCES credit_classes(class_id) ON DELETE CASCADE,       -- KHÓA NGOẠI: Liên kết với bảng credit_classes (Lớp học tín chỉ)
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE          -- KHÓA NGOẠI: Liên kết với bảng students (Sinh viên)
);

-- ==================================================================
-- BẢNG 9: CLASS_SESSIONS (Tiết học trong lịch)
-- ==================================================================
CREATE TABLE class_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,                          -- KHÓA CHÍNH: ID tự động
    class_id VARCHAR(50) NOT NULL,                                      -- KHÓA NGOẠI: Liên kết với bảng credit_classes (Lớp học tín chỉ)
    room_id VARCHAR(20) NOT NULL,                                       -- KHÓA NGOẠI: Liên kết với bảng classrooms (Phòng học)
    session_date DATE NOT NULL,                                         -- Ngày học (VD: 2023-10-20)
    shift INT NOT NULL,                                                 -- Tiết học (VD: 1, 2, 3, 4...)
    start_time DATETIME NOT NULL,                                       -- Thời gian bắt đầu (VD: 2023-10-20 07:00:00)
    end_time DATETIME NOT NULL,                                         -- Thời gian kết thúc (VD: 2023-10-20 08:30:00)
    
    session_type VARCHAR(20) DEFAULT 'Theory',                          -- Loại buổi học: 'Theory' (Lý thuyết), 'Practice' (Thực hành), 'Exam' (Thi)
    status VARCHAR(20) DEFAULT 'Scheduled',                             -- Trạng thái: 'Scheduled' (Đã lên lịch), 'In_Progress' (Đang diễn ra), 'Completed' (Đã xong), 'Cancelled' (Nghỉ học)
    notes VARCHAR(255) NULL,                                            -- Ghi chú (VD: "Học bù cho ngày 20/11")
    
    CONSTRAINT uc_room_schedule UNIQUE (room_id, session_date, shift),  -- Chống trùng lịch phòng học (Không thể có 2 lớp học dùng chung 1 phòng trong cùng 1 tiết của 1 ngày) 
    CONSTRAINT chk_session_time CHECK (end_time > start_time),          -- Kiểm tra logic thời gian kết thúc phải lớn hơn thời gian bắt đầu
    FOREIGN KEY (class_id) REFERENCES credit_classes(class_id) ON DELETE CASCADE, -- KHÓA NGOẠI: Liên kết với bảng credit_classes (Lớp học tín chỉ)
    FOREIGN KEY (room_id) REFERENCES classrooms(room_id) ON DELETE RESTRICT -- KHÓA NGOẠI: Liên kết với bảng classrooms (Phòng học)
);

-- ==================================================================
-- BẢNG 10: ATTENDANCE_RECORDS (Lịch sử điểm danh)
-- ==================================================================
CREATE TABLE attendance_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    student_id VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    recorded_at DATETIME NULL,
    confidence_score FLOAT NULL,
    proof_image_url VARCHAR(255) NULL,
    notes VARCHAR(255) NULL,
    updated_by INT NULL,                                                -- KHÓA NGOẠI: Liên kết với account_id của người chỉnh sửa cuối
    
    CONSTRAINT uc_session_student UNIQUE (session_id, student_id),                      -- Đảm bảo 1 sinh viên chỉ có 1 dòng điểm danh cho 1 tiết học
    FOREIGN KEY (session_id) REFERENCES class_sessions(session_id) ON DELETE CASCADE,   -- KHÓA NGOẠI: Liên kết với bảng class_sessions (Buổi học)
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,         -- KHÓA NGOẠI: Liên kết với bảng students (Sinh viên)
    FOREIGN KEY (updated_by) REFERENCES accounts(account_id) ON DELETE SET NULL         -- KHÓA NGOẠI: Liên kết với bảng accounts (Tài khoản người cập nhật)
);

-- ==================================================================
-- BẢNG MỚI 1: FACULTIES (Khoa / Viện quản lý)
-- ==================================================================
CREATE TABLE faculties (
    faculty_id VARCHAR(20) PRIMARY KEY,               -- Mã Khoa (VD: FIT, FVT, FCB)
    faculty_name VARCHAR(150) UNIQUE NOT NULL,        -- Tên Khoa (VD: Khoa Công nghệ thông tin 2)
    dean_id VARCHAR(20) NULL,                         -- Trưởng khoa (Sẽ gán Khóa ngoại sau)
    office_room VARCHAR(50) NULL,                     -- Văn phòng Khoa (VD: Phòng 2A01)
    phone_number VARCHAR(20) NULL,                    -- Số điện thoại VPK
    status VARCHAR(20) DEFAULT 'Active'               -- Trạng thái
);

-- ==================================================================
-- BẢNG MỚI 2: MAJORS (Ngành học / Chuyên ngành)
-- ==================================================================
CREATE TABLE majors (
    major_id VARCHAR(20) PRIMARY KEY,                 -- Mã Ngành (VD: 7480201)
    major_name VARCHAR(150) UNIQUE NOT NULL,          -- Tên Ngành (VD: Công nghệ thông tin)
    faculty_id VARCHAR(20) NOT NULL,                  -- Ngành này thuộc Khoa nào
    degree_level VARCHAR(50) DEFAULT 'Bachelors',     -- Bậc đào tạo (Đại học, Cao đẳng, Thạc sĩ)
    
    FOREIGN KEY (faculty_id) REFERENCES faculties(faculty_id) ON DELETE CASCADE
);





-- Trigger tự động phân loại trạng thái điểm danh dựa trên thời gian (Present, Late, Absent)
DELIMITER $$

CREATE TRIGGER trg_auto_attendance_status
BEFORE INSERT ON attendance_records
FOR EACH ROW
BEGIN
    DECLARE v_start_time DATETIME;
    DECLARE time_diff INT;

    -- 1. Lấy thời gian bắt đầu (start_time) của buổi học từ bảng class_sessions
    SELECT start_time INTO v_start_time
    FROM class_sessions
    WHERE session_id = NEW.session_id;

    -- 2. Nếu bản ghi có thời gian điểm danh (recorded_at)
    IF NEW.recorded_at IS NOT NULL AND v_start_time IS NOT NULL THEN
        
        -- Tính khoảng chênh lệch tính bằng giây (recorded_at - start_time)
        SET time_diff = TIMESTAMPDIFF(SECOND, v_start_time, NEW.recorded_at);

        -- 3. Logic phân loại trạng thái tự động
        IF time_diff <= 0 THEN
            -- Điểm danh trước hoặc đúng giờ bắt đầu
            SET NEW.status = 'Present';
            
        -- Cho phép đi trễ trong vòng 15 phút (900 giây), sau 15 phút tính là Absent
        ELSEIF time_diff > 0 AND time_diff <= 900 THEN
            SET NEW.status = 'Late';
            
        ELSE
            -- Quá 15 phút mà vẫn quét hoặc cập nhật muộn
            SET NEW.status = 'Absent';
        END IF;
        
    ELSE
        -- Nếu không có thời gian recorded_at (ví dụ điểm danh thủ công hoặc mặc định mới tạo)
        IF NEW.status IS NULL THEN
            SET NEW.status = 'Absent';
        END IF;
    END IF;

END$$

DELIMITER ;



-- ==================================================================
-- TRIGGER 1: Tự động cập nhật trạng thái khi UPDATE điểm danh
-- ==================================================================
DELIMITER $$

CREATE TRIGGER trg_auto_attendance_status_update
BEFORE UPDATE ON attendance_records
FOR EACH ROW
BEGIN
    DECLARE v_start_time DATETIME;
    DECLARE time_diff INT;

    -- Lấy thời gian bắt đầu của buổi học
    SELECT start_time INTO v_start_time
    FROM class_sessions
    WHERE session_id = NEW.session_id;

    -- Nếu có thay đổi về thời gian recorded_at
    IF NEW.recorded_at IS NOT NULL AND v_start_time IS NOT NULL THEN
        SET time_diff = TIMESTAMPDIFF(SECOND, v_start_time, NEW.recorded_at);

        IF time_diff <= 0 THEN
            SET NEW.status = 'Present';
        ELSEIF time_diff > 0 AND time_diff <= 900 THEN
            SET NEW.status = 'Late';
        ELSE
            SET NEW.status = 'Absent';
        END IF;
    END IF;
END$$

DELIMITER ;

-- ==================================================================
-- TRIGGER 2: Tự động tăng sĩ số (current_students) khi SV đăng ký lớp tín chỉ
-- ==================================================================
DELIMITER $$

CREATE TRIGGER trg_enrollment_after_insert
AFTER INSERT ON class_enrollments
FOR EACH ROW
BEGIN
    IF NEW.status = 'Enrolled' THEN
        UPDATE credit_classes
        SET current_students = current_students + 1
        WHERE class_id = NEW.class_id;
    END IF;
END$$

DELIMITER ;

-- ==================================================================
-- TRIGGER 3: Tự động giảm sĩ số khi SV hủy/rút môn học (Dropped hoặc xóa record)
-- ==================================================================
DELIMITER $$

CREATE TRIGGER trg_enrollment_after_delete
AFTER DELETE ON class_enrollments
FOR EACH ROW
BEGIN
    IF OLD.status = 'Enrolled' THEN
        UPDATE credit_classes
        SET current_students = GREATEST(0, current_students - 1)
        WHERE class_id = OLD.class_id;
    END IF;
END$$

DELIMITER ;




DELIMITER $$

CREATE TRIGGER trg_prevent_student_enrollment_conflict
BEFORE INSERT ON class_enrollments
FOR EACH ROW
BEGIN
    DECLARE conflict_count INT;

    -- Chỉ kiểm tra nếu trạng thái là Enrolled
    IF NEW.status = 'Enrolled' THEN
        SELECT COUNT(*) INTO conflict_count
        FROM class_schedules ns -- Lịch của lớp chuẩn bị đăng ký (New Schedule)
        JOIN class_schedules es ON ns.day_of_week = es.day_of_week -- So khớp trùng Thứ với lịch đang học (Existing Schedule)
        JOIN class_enrollments ce ON ce.class_id = es.class_id
        WHERE ns.class_id = NEW.class_id                -- Điều kiện lịch mới
          AND ce.student_id = NEW.student_id            -- Điều kiện sinh viên
          AND ce.status = 'Enrolled'                    -- Chỉ check lớp SV đang học
          -- Công thức bắt trùng lặp tiết học
          AND ns.start_shift <= es.end_shift 
          AND ns.end_shift >= es.start_shift;

        IF conflict_count > 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = 'Đăng ký thất bại: Thời khóa biểu của lớp này bị trùng với lớp khác bạn đã đăng ký!';
        END IF;
    END IF;
END$$

DELIMITER ;



-- ==============================================
-- Trigger 4: Ngăn chặn xung đột lịch học (dựa vào phòng và giảng viên)
-- ==============================================

DELIMITER $$

CREATE TRIGGER trg_prevent_schedule_conflict
BEFORE INSERT ON class_schedules
FOR EACH ROW
BEGIN
    DECLARE conflict_count INT;
    DECLARE v_lecturer_id VARCHAR(20);
    DECLARE v_semester_id VARCHAR(20);

    -- 1. Kiểm tra trùng lịch Phòng Học
    SELECT COUNT(*) INTO conflict_count FROM class_schedules cs
    JOIN credit_classes cc ON cs.class_id = cc.class_id
    WHERE cs.room_id = NEW.room_id 
      AND cs.day_of_week = NEW.day_of_week
      AND NEW.start_shift <= cs.end_shift 
      AND NEW.end_shift >= cs.start_shift
      -- Phải check phòng này trong cùng 1 học kỳ
      AND cc.semester_id = (SELECT semester_id FROM credit_classes WHERE class_id = NEW.class_id);

    IF conflict_count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Lỗi Xếp Lịch: Phòng học đã được sử dụng trong khoảng thời gian này!';
    END IF;

    -- Lấy thông tin Giảng viên và Học kỳ của lớp đang được xếp lịch
    SELECT lecturer_id, semester_id INTO v_lecturer_id, v_semester_id
    FROM credit_classes WHERE class_id = NEW.class_id;

    -- 2. Kiểm tra trùng lịch Giảng Viên (Có dạy lớp khác không?)
    SELECT COUNT(*) INTO conflict_count FROM class_schedules cs
    JOIN credit_classes cc ON cs.class_id = cc.class_id
    WHERE cc.lecturer_id = v_lecturer_id 
      AND cc.semester_id = v_semester_id 
      AND cs.day_of_week = NEW.day_of_week
      AND NEW.start_shift <= cs.end_shift 
      AND NEW.end_shift >= cs.start_shift;

    IF conflict_count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Lỗi Xếp Lịch: Giảng viên đã bị kẹt lịch dạy lớp khác!';
    END IF;

    -- 3. KIỂM TRA LỊCH BẬN CÁ NHÂN CỦA GIẢNG VIÊN
    SELECT COUNT(*) INTO conflict_count FROM lecturer_busy_times lbt
    WHERE lbt.lecturer_id = v_lecturer_id 
      AND lbt.semester_id = v_semester_id 
      AND lbt.day_of_week = NEW.day_of_week
      AND NEW.start_shift <= lbt.end_shift 
      AND NEW.end_shift >= lbt.start_shift;

    IF conflict_count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Lỗi Xếp Lịch: Giảng viên đã đăng ký BẬN vào khung giờ này!';
    END IF;
END$$

DELIMITER ;


DELIMITER $$
CREATE TRIGGER trg_enrollment_after_update
AFTER UPDATE ON class_enrollments
FOR EACH ROW
BEGIN
    -- SV mới đăng ký (Từ trạng thái khác chuyển sang Enrolled)
    IF NEW.status = 'Enrolled' AND OLD.status != 'Enrolled' THEN
        UPDATE credit_classes SET current_students = current_students + 1 WHERE class_id = NEW.class_id;
    -- SV rút môn (Từ Enrolled chuyển sang trạng thái khác)
    ELSEIF NEW.status != 'Enrolled' AND OLD.status = 'Enrolled' THEN
        UPDATE credit_classes SET current_students = GREATEST(0, current_students - 1) WHERE class_id = OLD.class_id;
    END IF;
END$$
DELIMITER ;



-- BẬT LẠI KIỂM TRA KHÓA NGOẠI Ở DƯỚI CÙNG FILE
SET FOREIGN_KEY_CHECKS = 1;