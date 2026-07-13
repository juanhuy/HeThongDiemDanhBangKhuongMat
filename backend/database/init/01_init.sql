-- Đặt charset mặc định để hỗ trợ Tiếng Việt
ALTER DATABASE ai_attendance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ai_attendance_db;

-- 1. Bảng accounts
CREATE TABLE accounts (
    account_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(30) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME NULL,
    refresh_token VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng students
CREATE TABLE students (
    student_id VARCHAR(20) PRIMARY KEY,
    account_id INT UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(15),
    administrative_class VARCHAR(50),
    major VARCHAR(100),
    cohort VARCHAR(20),
    training_program VARCHAR(50),
    academic_status VARCHAR(50),
    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE SET NULL
);

-- 3. Bảng lecturers
CREATE TABLE lecturers (
    lecturer_id VARCHAR(20) PRIMARY KEY,
    account_id INT UNIQUE,
    full_name VARCHAR(50) NOT NULL,
    email VARCHAR(50) UNIQUE NOT NULL,
    phone_number VARCHAR(15),
    department VARCHAR(50),
    FOREIGN KEY (account_id) REFERENCES accounts(account_id) ON DELETE SET NULL
);

-- 4. Bảng face_features (LONGBLOB để lưu mảng Float32)
CREATE TABLE face_features (
    feature_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20) NOT NULL,
    face_vector LONGBLOB NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

-- 5. Bảng classrooms
CREATE TABLE classrooms (
    room_id VARCHAR(20) PRIMARY KEY,
    room_name VARCHAR(100) NOT NULL,
    camera_rtsp_url VARCHAR(255) NULL,
    building VARCHAR(50)
);

-- 6. Bảng subjects
CREATE TABLE subjects (
    subject_id VARCHAR(20) PRIMARY KEY,
    subject_name VARCHAR(150) NOT NULL,
    credits INT NOT NULL
);

-- 7. Bảng credit_classes
CREATE TABLE credit_classes (
    class_id VARCHAR(50) PRIMARY KEY,
    subject_id VARCHAR(20) NOT NULL,
    lecturer_id VARCHAR(20) NOT NULL,
    semester INT NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id) ON DELETE CASCADE,
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(lecturer_id) ON DELETE CASCADE
);

-- 8. Bảng class_enrollments (Bảng trung gian N-N)
CREATE TABLE class_enrollments (
    class_id VARCHAR(50) NOT NULL,
    student_id VARCHAR(20) NOT NULL,
    enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (class_id, student_id),
    FOREIGN KEY (class_id) REFERENCES credit_classes(class_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

-- 9. Bảng class_sessions
CREATE TABLE class_sessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    class_id VARCHAR(50) NOT NULL,
    room_id VARCHAR(20) NOT NULL,
    session_date DATE NOT NULL,
    shift INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    FOREIGN KEY (class_id) REFERENCES credit_classes(class_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES classrooms(room_id) ON DELETE RESTRICT
);

-- 10. Bảng attendance_records
CREATE TABLE attendance_records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    student_id VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    recorded_at DATETIME NULL,
    confidence_score FLOAT NULL,
    proof_image_url VARCHAR(255) NULL,
    notes VARCHAR(255) NULL,
    updated_by VARCHAR(20) NULL,
    FOREIGN KEY (session_id) REFERENCES class_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);