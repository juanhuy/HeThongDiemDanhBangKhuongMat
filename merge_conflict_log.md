# Báo Cáo Xử Lý Merge Conflict (main vs origin/phu)

**Ngày thực hiện**: 10/08/2026  
**Nhánh nguồn**: `main`  
**Nhánh hợp nhất**: `origin/phu` (commit `f9edae4a1bfdb99a03896a75f648aa55962eae47` bởi dieuhang20404)  
**Quy tắc xử lý**: Giữ nguyên tính năng của cả 2 nhánh (Preserve Both Features). Các điểm trùng lặp/thay đổi kiến trúc được ghi nhận chi tiết để kiểm tra lại sau.

---

## 1. Tổng Quan Kết Quả

- **Tổng số tệp bị conflict ban đầu**: 23 tệp.
- **Trạng thái**: Đã giải quyết 100% (0 conflict markers còn lại).
- **Kiểm tra cú pháp Backend**: Compiled 100% thành công bằng `py_compile`.
- **Kiểm tra Tệp xóa**: Đã xử lý 4 tệp bị xóa theo nhánh `origin/phu`.

---

## 2. Chi Tiết Xử Lý Theo Từng Module & Tệp Tin

### 2.1. Backend Models (`backend/app/models/`)

1. **`account.py`**:
   - *Tính năng main*: Giữ trường `failed_login_attempts` và `lock_until` cho tính năng Rate Limiting & khóa tài khoản tự động.
   - *Tính năng phu*: Giữ các trường thời gian `created_at`, `updated_at`.
   - *Giải pháp*: Kết hợp đầy đủ các cột trên model `Account`.

2. **`credit_class.py`**:
   - *Tính năng main*: Giữ tên học kỳ (`semester`), khóa sinh viên (`cohort`), niên khóa (`academic_year`), sĩ số hiện tại (`current_students`).
   - *Tính năng phu*: Giữ mã học kỳ liên kết (`semester_id`), loại lớp (`class_type`), tuần bắt đầu/kết thúc (`start_week`, `end_week`), thông tin nhóm/tổ (`group_number`, `sub_group_number`), lớp cha (`parent_class_id`).
   - *Giải pháp*: Kết hợp toàn bộ các thuộc tính, mối quan hệ (`relationship`) và foreign keys để phục vụ cả 2 cơ chế quản lý lớp tín chỉ.

3. **`student.py`**:
   - *Tính năng main*: Cột `administrative_class` (xử lý dưới dạng `@property`getter/setter tương thích ngược với FK `administrative_class_id`), `faculty`, `major`.
   - *Tính năng phu*: Các cột Foreign Key chuẩn hóa `administrative_class_id`, `major_id`, `faculty_id`, `cohort`.
   - *Giải pháp*: Giữ các FK mới từ `origin/phu` đồng thời duy trì `@property` fallback cho `administrative_class`, `major`, `faculty` để các API cũ không bị bẻ gãy.

4. **`subject.py`**:
   - *Tính năng main*: Các cột tín chỉ chi tiết `theory_credits`, `practical_credits`, môn tiên quyết `prerequisites`, niên khóa `semester`, mối quan hệ `credit_classes`.
   - *Tính năng phu*: Cột tín chỉ tổng `credits`, số tiết lý thuyết/thực hành (`theory_periods`, `practical_periods`, `total_periods`), `faculty_id`.
   - *Giải pháp*: Gộp toàn bộ các thuộc tính, các cột tính toán (`computed/hybrid properties`) và mối quan hệ giữa Môn học với Khoa & Lớp tín chỉ.

---

### 2.2. Backend Schemas & CRUD (`backend/app/schemas/` & `backend/app/crud/`)

5. **`schemas/subject.py`**:
   - *Tính năng main*: Field `prerequisites`, `semester` trong `SubjectBase`.
   - *Tính năng phu*: Cột `credits`, `theory_credits`, `practical_credits`, `theory_periods`, `practical_periods`, `total_periods`, `faculty_id`, và schema `PaginatedSubjectResponse`.
   - *Giải pháp*: Gộp toàn bộ fields vào `SubjectBase` & `SubjectUpdate`, giữ `PaginatedSubjectResponse`.

6. **`crud/crud_lecturer.py`**:
   - *Tính năng main*: Hàm `delete_lecturer` khóa tài khoản thay vì xóa cứng dữ liệu (`account.status = "Locked"`).
   - *Tính năng phu*: Hàm `generate_lecturer_id` tự động sinh mã giảng viên.
   - *Giải pháp*: Giữ cả `delete_lecturer` lẫn `generate_lecturer_id`.

7. **`crud/crud_student.py`**:
   - *Tính năng main*: Chuẩn hóa trạng thái học vụ sinh viên bằng bộ lọc `ACCOUNT_LOCKED_STATUSES` (Tạm dừng, Buộc thôi học, Đã tốt nghiệp...).
   - *Giải pháp*: Áp dụng bộ lọc trạng thái khóa tài khoản đồng bộ.

---

### 2.3. Core AI & Service Logic (`core/` & `backend/app/main.py`)

8. **`core/face_analysis.py`**:
   - *Tính năng main*: Tự động tạo bản ghi `Student`, `Account`, `UserProfile` trong hàm `dang_ky_mat` khi sinh viên mới đăng ký khuôn mặt; loại bỏ đường dẫn venv cứng `sys.path`.
   - *Tính năng phu*: Thuật toán phân tích khuôn mặt FAISS & InsightFace.
   - *Giải pháp*: Giữ tính năng tự động tạo tài khoản khi đăng ký khuôn mặt và loại bỏ khai báo trùng lặp `recognize_image`.

9. **`backend/app/main.py`**:
   - *Tính năng main*: Thay thế các câu lệnh `import` rải rác bằng `import app.models`, giữ đoạn mã kiểm tra và tự động cập nhật DDL (auto-alter table) khi khởi chạy ứng dụng.
   - *Tính năng phu*: Đăng ký bộ định tuyến mô-đun hóa `class_management_router` và các API router mới.
   - *Giải pháp*: Tích hợp cả bộ khởi tạo DDL tự động và đăng ký router đầy đủ.

---

### 2.4. Backend Endpoints (`backend/app/api/endpoints/`)

10. **`api_admin_lecturers.py`**:
    - *Tính năng main*: Import CSV `/import`, tìm kiếm theo mã `/{lecturer_id}`, tự động tạo mã GV, ghi log kiểm vết (`log_audit`).
    - *Tính năng phu*: Các đường dẫn API chuẩn hóa RESTful.
    - *Giải pháp*: Kết hợp tất cả endpoint, giữ cơ chế `log_audit`.

11. **`api_admin_students.py`**:
    - *Tính năng main*: Import Excel/CSV với ánh xạ cột linh hoạt, route alias `/import` & `/import/excel`, ghi log audit.
    - *Tính năng phu*: Tìm kiếm phân trang danh sách sinh viên.
    - *Giải pháp*: Giữ cả 2 luồng import và phân trang.

12. **`api_ai.py`**:
    - *Tính năng main*: GET `/images/{filename}` để phục vụ ảnh khuôn mặt, gửi thông báo real-time khi điểm danh thành công trong `record_attendance_db`.
    - *Tính năng phu*: API nhận diện ảnh kèm liveness & challenge anti-spoofing parameters.
    - *Giải pháp*: Giữ toàn bộ endpoint phục vụ ảnh, gửi thông báo điểm danh và thuật toán liveness. Sửa lỗi trùng lặp append mảng kết quả.

13. **`api_auth.py`**:
    - *Tính năng main*: Rate limiting đăng nhập, tự động rehash mật khẩu, endpoint đổi mật khẩu, xem và đánh dấu đọc thông báo (`/notifications`, `/notifications/read-all`).
    - *Tính năng phu*: Đăng nhập JWT chuẩn REST.
    - *Giải pháp*: Loại bỏ hàm `login` bị trùng, giữ đầy đủ tính năng bảo mật rate limit & hệ thống thông báo.

14. **`api_subject.py`**:
    - *Tính năng main*: Import môn học qua CSV `/import/csv`, CRUD môn học kèm ghi log audit.
    - *Giải pháp*: Kết hợp CRUD môn học và import CSV.

15. **`api_credit_classes.py`**:
    - *Tính năng main*: Quy định đăng ký học phần đầy đủ (kiểm tra đợt đăng ký, học kỳ, sĩ số, môn tiên quyết, giới hạn tín chỉ, trùng môn, trùng lịch học, trạng thái học vụ), đăng ký hàng loạt cho lớp hành chính, duyệt đơn xin nghỉ phép, ghi log audit.
    - *Tính năng phu*: Tách thành các router mô-đun (`api_schedules`, `credit_classes`, `attendance`, `enrollments`).
    - *Giải pháp*: Khôi phục và duy trì toàn bộ API xử lý nghiệp vụ đăng ký học phần & điểm danh của hệ thống, loại bỏ các đoạn mã comment dư thừa.

---

### 2.5. Frontend Module (`frontend/`)

16. **`frontend/src/api/client.js`**:
    - *Tính năng main*: Quản lý phiên đăng nhập (`getToken`, `setToken`, `storeSession`, `clearSession`, `getStoredUser`, `setOnUnauthorized`), tự động đính kèm `Authorization: Bearer <token>`, xử lý 401 logout tự động.
    - *Tính năng phu*: Tự động đọc và định dạng `API_BASE` từ biến môi trường `VITE_API_BASE` (fallback `http://127.0.0.1:8000`), helper `formBody`.
    - *Giải pháp*: Gộp 100% tính năng quản lý token session, tự động gắn header bearer auth và xử lý `API_BASE` / `formBody`.

17. **`frontend/src/components/common/Sidebar.jsx`**:
    - *Tính năng main*: Menu điều hướng cho Admin (Duyệt Face ID, Điểm danh Camera, Bảng điều khiển Demo), Giảng viên, Sinh viên.
    - *Tính năng phu*: Menu quản lý Khoa (`faculties_management`), Ngành (`majors_management`), Môn học, Phòng học, Lớp tín chỉ.
    - *Giải pháp*: Kết hợp toàn bộ danh mục menu icon từ cả 2 nhánh.

18. **`frontend/src/App.jsx`**:
    - *Tính năng main*: Tự động cập nhật log điểm danh real-time, hiển thị thông báo popup khi được điểm danh tự động, layout giao diện responsive mobile/desktop.
    - *Tính năng phu*: Cấu trúc giao diện mô-đun hóa mới (`/components/student`, `/components/lecturer`, `/components/admin`).
    - *Giải pháp*: Tích hợp toàn bộ hệ thống routing mô-đun mới với cơ chế polling thông báo điểm danh real-time.

19. **`frontend/package-lock.json`**:
    - *Giải pháp*: Giữ bản lockfile đồng bộ với `package.json`.

---

## 3. Xử Lý Các Tệp Đã Xóa (`Deleted by them`)

Các tệp sau đây bị xóa ở nhánh `origin/phu` do được thay thế bằng các thành phần mô-đun mới:
1. `backend/app/api/endpoints/api_admin_faces.py` -> Đã thay thế bằng `CameraDashboard.jsx`, `PendingFaces.jsx`, và API `/api/ai/*`. -> **Đã chạy `git rm`**.
2. `backend/app/models/attendance_history.py` -> Đã thay thế bằng `attendance_record.py`. -> **Đã chạy `git rm`**.
3. `backend/app/models/student_class.py` -> Đã thay thế bằng `class_enrollments.py`. -> **Đã chạy `git rm`**.
4. `frontend/src/components/AIAttendance.jsx` -> Đã thay thế bằng `CameraDashboard.jsx` & `PendingFaces.jsx`. -> **Đã chạy `git rm`**.

---

## 4. Ghi Chú & Khuyến Nghị Trùng Lặp Cần Theo Dõi (Follow-up Items)

1. **Mô-đun Lớp Tín Chỉ & Lịch Học**:
   - Chi nhánh `origin/phu` giới thiệu thêm các file router riêng như `api_schedules.py`, `credit_classes.py`, `enrollments.py`.
   - Hệ thống hiện tại đang duy trì cả `api_credit_classes.py` (chứa logic đăng ký học phần nâng cao) và các router mới. Khuyến nghị kiểm tra nếu cần hợp nhất các API path trùng lặp giữa hai cách tiếp cận.
2. **Model Đăng Ký Sinh Viên**:
   - Đảm bảo cơ sở dữ liệu đã chạy migration/DDL auto-alter để có cả 2 nhóm cột (ví dụ: `administrative_class` cũ và `administrative_class_id` FK mới).
