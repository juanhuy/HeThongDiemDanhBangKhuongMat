-- Đặt charset mặc định để hỗ trợ Tiếng Việt
ALTER DATABASE ai_attendance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ai_attendance_db;

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
    avatar_url VARCHAR(255),                          -- Đường dẫn lưu ảnh đại diện/ảnh thẻ
    
    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE SET NULL
);

-- =========================================================================
-- BẢNG 2: STUDENTS (Thông tin học thuật riêng của Sinh viên)
-- =========================================================================
CREATE TABLE students (
    student_id VARCHAR(20) PRIMARY KEY,               -- KHÓA CHÍNH: Mã số sinh viên (VD: N22DCCN160)
    profile_id INT UNIQUE NOT NULL,                   -- KHÓA NGOẠI (1-1): Liên kết với bảng user_profiles (Lấy thông tin cá nhân)
    
    administrative_class VARCHAR(50),                 -- Lớp hành chính (VD: D22CQCNMT01-N)
    major VARCHAR(100),                               -- Ngành học (VD: Công nghệ thông tin)
    specialization VARCHAR(100),                      -- Chuyên ngành (VD: Công nghệ phần mềm)
    department VARCHAR(100),                          -- Khoa quản lý (VD: Khoa CNTT 2)
    cohort VARCHAR(20),                               -- Niên khóa (VD: 2022-2027)
    training_program VARCHAR(50),                     -- Hệ đào tạo / Bậc đào tạo (VD: Đại học Chính quy)
    academic_status VARCHAR(50),                      -- Trạng thái học tập (VD: Đang học, Bảo lưu, Đã tốt nghiệp)
    
    FOREIGN KEY (profile_id) REFERENCES user_profiles(profile_id) ON DELETE CASCADE
);

-- =========================================================================
-- BẢNG 3: LECTURERS (Thông tin công tác riêng của Giảng viên)
-- =========================================================================
CREATE TABLE lecturers (
    lecturer_id VARCHAR(20) PRIMARY KEY,              -- KHÓA CHÍNH: Mã định danh giảng viên
    profile_id INT UNIQUE NOT NULL,                   -- KHÓA NGOẠI (1-1): Liên kết với bảng user_profiles (Lấy thông tin cá nhân)
    
    department VARCHAR(50),                           -- Khoa/Bộ môn trực thuộc (VD: Bộ môn Khoa học Máy tính)
    academic_title VARCHAR(50),                       -- Học hàm, học vị (VD: ThS, TS, PGS...)

    position VARCHAR(100),                            -- Chức vụ quản lý (VD: Trưởng bộ môn, Giảng viên)
    employment_type VARCHAR(50),                      -- Hình thức công tác (Cơ hữu, Thỉnh giảng, Trợ giảng)
    teaching_status VARCHAR(50) DEFAULT 'Active',     -- Trạng thái (Active, On_Leave, Retired, Resigned)
    hire_date DATE,                                   -- Ngày bắt đầu công tác tại trường
    
    FOREIGN KEY (profile_id) REFERENCES user_profiles(profile_id) ON DELETE CASCADE
);


-- ==================================================================
-- BẢNG 5: CLASSROOMS (Thông tin các phòng học)
-- ==================================================================
CREATE TABLE classrooms (
    -- Khóa chính
    room_id         VARCHAR(20)  PRIMARY KEY,       -- Mã định danh phòng học

    -- Thông tin cơ bản
    room_name       VARCHAR(100) NOT NULL,          -- Tên phòng học (VD: Phòng 101, Giảng đường A)
    building        VARCHAR(50),                    -- Tòa nhà/Khu vực (VD: Tòa A, Khu C)
    notes           VARCHAR(255) NULL,              -- Ghi chú thêm (VD: "Máy chiếu đang hỏng mờ")

    -- Camera giám sát
    camera_rtsp_url VARCHAR(255) NULL,              -- URL luồng camera (RTSP/HTTP)
    camera_status   VARCHAR(20) DEFAULT 'Online',   -- Trạng thái Camera: Online / Offline / Defective

    -- Quản lý sức chứa và phân loại
    capacity        INT DEFAULT 50,                 -- Sức chứa tối đa
    room_type       VARCHAR(50) DEFAULT 'Theory',   -- Loại phòng: Theory / Computer_Lab / Specialized_Lab

    -- Quản lý trạng thái
    status          VARCHAR(20) DEFAULT 'Active'    -- Trạng thái phòng: Active / Maintenance
);


-- ==================================================================
-- BẢNG 6: SUBJECTS (Thông tin môn học)
-- ==================================================================
CREATE TABLE subjects (
    subject_id VARCHAR(20) PRIMARY KEY,                   -- KHÓA CHÍNH: Mã môn học (VD: INT1152)
    subject_name VARCHAR(150) NOT NULL,                   -- Tên môn học (VD: Nhập môn Lập trình)
    theory_credits INT DEFAULT 0,                         -- Số tín chỉ lý thuyết
    practical_credits INT DEFAULT 0,                      -- Số tín chỉ thực hành
    credits INT DEFAULT 0,                                -- Tổng tín chỉ (sẽ được trigger cập nhật)
    department VARCHAR(100) NULL,                         -- Khoa/Bộ môn phụ trách
    is_active BOOLEAN DEFAULT TRUE                        -- Trạng thái môn học
);

-- Tạo trigger để tự động tính credits
DELIMITER $$

CREATE TRIGGER trg_subjects_credits
BEFORE INSERT ON subjects
FOR EACH ROW
BEGIN
    SET NEW.credits = NEW.theory_credits + NEW.practical_credits;
END$$

DELIMITER ;

-- Trigger cho UPDATE (để khi sửa theory_credits hoặc practical_credits thì credits cũng cập nhật)
DELIMITER $$

CREATE TRIGGER trg_subjects_credits_update
BEFORE UPDATE ON subjects
FOR EACH ROW
BEGIN
    SET NEW.credits = NEW.theory_credits + NEW.practical_credits;
END$$

DELIMITER ;

-- ==================================================================
-- BẢNG 7: CREDIT_CLASSES (Lớp học tín chỉ)
-- ==================================================================
CREATE TABLE credit_classes (
    class_id VARCHAR(50) PRIMARY KEY,                                                       -- KHÓA CHÍNH: ID tự động
    subject_id VARCHAR(20) NOT NULL,                                                        -- KHÓA NGOẠI: Liên kết với bảng subjects (Môn học)
    lecturer_id VARCHAR(20) NOT NULL,                                                       -- KHÓA NGOẠI: Liên kết với bảng lecturers (Giảng viên)
    semester INT NOT NULL,                                                                  -- Học kỳ (VD: 1, 2, 3, Hè)
    academic_year VARCHAR(20) NOT NULL,                                                     -- Niên khóa (VD: 2024-2025)

    class_group VARCHAR(20) NULL,                                                           -- Nhóm/Tổ (VD: Môn CSDL có Lớp chung 01, nhưng chia Tổ TH 1, 2, 3)
    max_students INT DEFAULT 50,                                                            -- Sĩ số tối đa cho phép đăng ký
    current_students INT DEFAULT 0,                                                         -- Sĩ số hiện tại (Giúp truy vấn nhanh không cần COUNT bảng enrollments)
    status VARCHAR(20) DEFAULT 'Active',                                                    -- Trạng thái lớp: 'Planning' (Dự kiến), 'Active' (Đang học), 'Completed' (Đã xong), 'Cancelled' (Bị hủy do ít SV)

    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE,         -- KHÓA NGOẠI: Liên kết với bảng subjects (Môn học)
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(lecturer_id) ON DELETE CASCADE       -- KHÓA NGOẠI: Liên kết với bảng lecturers (Giảng viên)
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







-- =================================================================================================
-- Đặt charset mặc định để hỗ trợ Tiếng Việt
-- ALTER DATABASE ai_attendance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- USE ai_attendance_db;

-- -- 1. Bảng accounts
-- CREATE TABLE accounts (
--     account_id INT AUTO_INCREMENT PRIMARY KEY,
--     username VARCHAR(30) UNIQUE NOT NULL,
--     password_hash VARCHAR(255) NOT NULL,
--     role VARCHAR(20) NOT NULL,
--     is_active BOOLEAN DEFAULT TRUE,
--     last_login DATETIME NULL,
--     refresh_token VARCHAR(255) NULL,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
-- );

-- -- 2. Bảng students
-- CREATE TABLE students (
--     student_id VARCHAR(20) PRIMARY KEY,
--     account_id INT UNIQUE,
--     full_name VARCHAR(100) NOT NULL,
--     email VARCHAR(100) UNIQUE NOT NULL,
--     phone_number VARCHAR(15),
--     administrative_class VARCHAR(50),
--     major VARCHAR(100),
--     cohort VARCHAR(20),
--     training_program VARCHAR(50),
--     academic_status VARCHAR(50),
--     FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE SET NULL
-- );

-- -- 3. Bảng lecturers
-- CREATE TABLE lecturers (
--     lecturer_id VARCHAR(20) PRIMARY KEY,
--     account_id INT UNIQUE,
--     full_name VARCHAR(50) NOT NULL,
--     email VARCHAR(50) UNIQUE NOT NULL,
--     phone_number VARCHAR(15),
--     department VARCHAR(50),
--     FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE SET NULL
-- );

-- -- 4. Bảng face_features (LONGBLOB để lưu mảng Float32)
-- CREATE TABLE face_features (
--     feature_id INT AUTO_INCREMENT PRIMARY KEY,
--     student_id VARCHAR(20) NOT NULL,
--     face_vector LONGBLOB NOT NULL,
--     is_primary BOOLEAN DEFAULT FALSE,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
-- );

-- -- 5. Bảng classrooms
-- CREATE TABLE classrooms (
--     room_id VARCHAR(20) PRIMARY KEY,
--     room_name VARCHAR(100) NOT NULL,
--     camera_rtsp_url VARCHAR(255) NULL,
--     building VARCHAR(50)
-- );

-- -- 6. Bảng subjects
-- CREATE TABLE subjects (
--     subject_id VARCHAR(20) PRIMARY KEY,
--     subject_name VARCHAR(150) NOT NULL,
--     credits INT NOT NULL
-- );

-- -- 7. Bảng credit_classes
-- CREATE TABLE credit_classes (
--     class_id VARCHAR(50) PRIMARY KEY,
--     subject_id VARCHAR(20) NOT NULL,
--     lecturer_id VARCHAR(20) NOT NULL,
--     semester INT NOT NULL,
--     academic_year VARCHAR(20) NOT NULL,
--     FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE,
--     FOREIGN KEY (lecturer_id) REFERENCES lecturers(lecturer_id) ON DELETE CASCADE
-- );

-- -- 8. Bảng class_enrollments (Bảng trung gian N-N)
-- CREATE TABLE class_enrollments (
--     class_id VARCHAR(50) NOT NULL,
--     student_id VARCHAR(20) NOT NULL,
--     enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
--     PRIMARY KEY (class_id, student_id),
--     FOREIGN KEY (class_id) REFERENCES credit_classes(class_id) ON DELETE CASCADE,
--     FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
-- );

-- -- 9. Bảng class_sessions
-- CREATE TABLE class_sessions (
--     session_id INT AUTO_INCREMENT PRIMARY KEY,
--     class_id VARCHAR(50) NOT NULL,
--     room_id VARCHAR(20) NOT NULL,
--     session_date DATE NOT NULL,
--     shift INT NOT NULL,
--     start_time DATETIME NOT NULL,
--     end_time DATETIME NOT NULL,
--     FOREIGN KEY (class_id) REFERENCES credit_classes(class_id) ON DELETE CASCADE,
--     FOREIGN KEY (room_id) REFERENCES classrooms(room_id) ON DELETE RESTRICT
-- );

-- -- 10. Bảng attendance_records
-- CREATE TABLE attendance_records (
--     record_id INT AUTO_INCREMENT PRIMARY KEY,
--     session_id INT NOT NULL,
--     student_id VARCHAR(20) NOT NULL,
--     status VARCHAR(20) NOT NULL,
--     recorded_at DATETIME NULL,
--     confidence_score FLOAT NULL,
--     proof_image_url VARCHAR(255) NULL,
--     notes VARCHAR(255) NULL,
--     updated_by VARCHAR(20) NULL,
--     FOREIGN KEY (session_id) REFERENCES class_sessions(session_id) ON DELETE CASCADE,
--     FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
-- );