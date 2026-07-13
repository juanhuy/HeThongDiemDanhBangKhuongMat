# Báo Cáo Tổng Quan và Kế Hoạch Triển Khai Hệ Thống Điểm Danh

## Phần 1: Báo Cáo Hiện Trạng Dự Án

### 1. Bố trí thư mục (Directory Structure)
Dự án được tổ chức khá rõ ràng, tách biệt giữa backend (API, Core AI, Services) và frontend:

*   **`api/`**: Chứa mã nguồn cho Backend Web Server sử dụng FastAPI (`main.py`, `routes.py`).
*   **`config/`**: Chứa các thiết lập cấu hình của dự án như `config.yaml` và `settings.py` (cấu hình AI model, Camera, Database, Server).
*   **`core/`**: Phần lõi trí tuệ nhân tạo (AI).
    *   `face_analysis.py`: Logic tải mô hình AI, chạy luồng (thread) ngầm nhận diện khung hình, trích xuất vector khuôn mặt.
    *   `face_matcher.py`: Tính toán khoảng cách/độ tương đồng (Cosine Similarity).
*   **`database/`**: Quản lý cơ sở dữ liệu (chứa file SQLite backup `app_db.sqlite` và thư mục lưu trữ ảnh người dùng `registered_images`).
*   **`frontend/`**: Chứa mã nguồn cho giao diện người dùng Web (React + Vite).
*   **`services/`**: Các dịch vụ trung gian kết nối giữa lõi AI, Backend và CSDL.
    *   `database_service.py`: Logic tương tác với cơ sở dữ liệu MySQL (các lệnh CRUD).
    *   `attendance_service.py`: Xử lý logic nghiệp vụ điểm danh (log thời gian, trùng lặp...).
*   **`utils/`**: Các hàm tiện ích hỗ trợ (ví dụ: vẽ bounding box `image_helpers`).
*   **`asset/` & `face_database/`**: Chứa các file tài nguyên tĩnh, ảnh mẫu.
*   **Các file Python ở thư mục gốc**: `main.py`, `nhandien.py`, `hocnhandien.py` dùng để chạy hệ thống nhận diện từ camera trên Desktop qua cửa sổ OpenCV độc lập.

### 2. Hệ thống chức năng hiện tại
*   **Đăng ký khuôn mặt sinh viên**: Tự động nhận diện khuôn mặt từ ảnh đầu vào, trích xuất đặc trưng (embedding vector) và lưu trữ cùng các thông tin cá nhân.
*   **Nhận diện khuôn mặt theo thời gian thực**: Chụp luồng video trực tiếp từ camera. Tách biệt thành luồng xử lý AI chạy ngầm để không gây giật lag (Multi-threading). Nhận dạng dựa vào Cosine Similarity.
*   **Điểm danh tự động**: Tự động so sánh khuôn mặt bắt được với dữ liệu đã lưu, ghi nhận lịch sử thời gian quét vào cơ sở dữ liệu.
*   **Quản lý dữ liệu giáo dục**: Tổ chức dữ liệu qua các bảng MySQL: `sinh_vien`, `mon_hoc`, `lop_tin_chi`, `lich_hoc_chi_tiet`.
*   **RESTful API Server**: Backend cung cấp các endpoint API (FastAPI) cho ứng dụng Web.
*   **Web Dashboard UI**: Giao diện trực quan bằng React để quản lý.

### 3. Công nghệ đang sử dụng (Tech Stack)
*   **AI & Computer Vision**: Python, `OpenCV`, `InsightFace` (buffalo_l model), `ONNX Runtime` (CUDA/CuDNN), `Numpy`.
*   **Backend & API**: Python, `FastAPI`, `Uvicorn`, Đa luồng (Threading).
*   **Database**: `MySQL` (thông qua `PyMySQL`).
*   **Frontend**: `React 19`, `Vite`, `lucide-react`.

### 4. Hướng dẫn Cài đặt & Chạy Dự án (Môi trường Local)
1. **Cài đặt Database**: Cài MySQL, mở port 3306, cập nhật tài khoản trong `config/config.yaml`.
2. **Cài đặt thư viện Backend**: `pip install fastapi uvicorn opencv-python insightface numpy pymysql onnxruntime`
3. **Chạy hệ thống**:
   * API Server: `python -m api.main`
   * Camera AI Desktop: `python main.py`
4. **Chạy Frontend**: Vào thư mục `frontend`, chạy `npm install` và `npm run dev`.

---

## Phần 2: Phương Án Hướng Dẫn Triển Khai Xây Dựng và Tích Hợp (Campus-wide System)

Mục tiêu: Đưa hệ thống hiện tại thành một giải pháp hoàn chỉnh áp dụng cho **từng phòng học** trong khuôn viên trường đại học để tự động điểm danh, kiểm soát ra vào và đồng bộ với hệ thống Quản lý đào tạo hiện có.

### 1. Kiến Trúc Triển Khai Phần Cứng (Hardware Architecture)

Do việc xử lý AI (InsightFace) đòi hỏi tài nguyên tính toán (GPU/CPU), có hai phương án triển khai phần cứng cho các phòng học:

*   **Phương án A: Điện toán biên (Edge Computing) - Khuyên dùng**
    *   **Phòng học**: Lắp đặt một Camera IP tiêu chuẩn kết nối với một thiết bị Edge AI (như *NVIDIA Jetson Nano*, *Raspberry Pi 5* hoặc Mini PC). 
    *   Thiết bị Edge sẽ tải code `main.py` của dự án, trích xuất đặc trưng (embedding) tại phòng học, và chỉ gửi tín hiệu (MSSV, Room ID, Timestamp) về Server trung tâm thông qua API. Giúp giảm tải băng thông mạng (không truyền video) và giảm tải cho Server.
*   **Phương án B: Xử lý tập trung (Centralized Processing)**
    *   **Phòng học**: Chỉ lắp đặt Camera IP (RTSP stream).
    *   **Phòng Server**: Hệ thống máy chủ mạnh (nhiều Card GPU) nhận luồng RTSP từ hàng trăm camera cùng lúc, phân tích khung hình và ghi nhận. Phương án này tốn băng thông nội bộ và chi phí máy chủ cao.

### 2. Sửa Đổi Lõi Phần Mềm (Software Adaptations)

Hệ thống hiện tại cần nâng cấp một số tính năng để phù hợp với môi trường thực tế:

*   **Quản lý định danh phòng học (Room ID Mapping)**: Trong `config.yaml`, cấu hình `device_id` cần được thay thế bằng URL luồng RTSP của Camera IP, kèm theo `Room_ID`.
*   **Tự động xác định lớp học**: Thuật toán điểm danh hiện tại cần kết nối với bảng `lich_hoc_chi_tiet`. Khi một sinh viên được nhận diện tại `Room_A` lúc `07:15`, hệ thống truy vấn CSDL xem lớp tín chỉ nào đang diễn ra tại `Room_A` lúc đó, nếu sinh viên thuộc lớp đó -> đánh dấu "Có mặt", nếu không -> cảnh báo "Vào nhầm phòng".
*   **Xử lý chống giả mạo (Anti-Spoofing/Liveness Detection)**: Bổ sung module Liveness Detection để tránh sinh viên đưa ảnh/điện thoại lên trước camera.
*   **Đồng bộ ngoại tuyến (Offline Sync)**: Nếu thiết bị tại phòng học mất mạng, lịch sử điểm danh được lưu tạm vào SQLite local. Khi có mạng trở lại, đồng bộ tự động lên MySQL Server.

### 3. Tích Hợp Vào Hệ Thống Quản Lý Đào Tạo (SIS Integration)

Để tích hợp hệ thống này vào hệ thống quản lý sinh viên/môn học hiện tại của nhà trường:

*   **Đồng bộ Dữ liệu 1 chiều (Từ Trường -> Hệ thống Điểm danh)**:
    *   Xây dựng một Cronjob hoặc API Listener chạy mỗi đêm.
    *   Kéo (Pull) dữ liệu từ CSDL của trường (hoặc qua REST API của trường) để cập nhật: *Danh sách sinh viên, Danh sách Môn học, Lịch học chi tiết ngày mai, Sinh viên nào đăng ký lớp nào*.
*   **Đồng bộ Dữ liệu 1 chiều (Từ Hệ thống Điểm danh -> Trường)**:
    *   Sau mỗi buổi học, Hệ thống Điểm danh gọi webhook/API đẩy báo cáo (Danh sách Vắng/Có mặt) trả về phần mềm quản lý của trường để giảng viên xem xét hoặc tính điểm chuyên cần.

### 4. Lộ Trình Triển Khai (Roadmap)

**Giai đoạn 1: Chuẩn hóa và Tích hợp API (1 tháng)**
*   Hoàn thiện luồng API lấy lịch học tự động từ thời gian thực & Room ID.
*   Xây dựng API kết nối thử nghiệm với CSDL mẫu của trường.
*   Thử nghiệm thuật toán nhận diện với 1 camera IP thay vì webcam laptop.

**Giai đoạn 2: Triển khai Thử nghiệm (Pilot) (1-2 tháng)**
*   Lựa chọn 2-3 phòng học làm Pilot. Lắp đặt thiết bị Edge (Mini PC) + Camera IP.
*   Nhập dữ liệu của khoảng 300 sinh viên tham gia các lớp học tại phòng đó.
*   Chạy song song: Giảng viên vẫn điểm danh tay để đối chiếu độ chính xác của Camera. Tinh chỉnh ngưỡng `threshold` và góc độ camera.

**Giai đoạn 3: Triển khai Diện rộng (Mass Deployment) (2-3 tháng)**
*   Lắp đặt phần cứng cho toàn bộ phòng học trong khuôn viên trường.
*   Thiết lập mạng VLAN riêng cho hệ thống camera/Edge device kết nối về server để đảm bảo bảo mật.
*   Bắt buộc sinh viên năm nhất (hoặc toàn trường) cập nhật ảnh chân dung chuẩn thông qua một Web Portal đăng ký.

**Giai đoạn 4: Bàn giao và Vận hành**
*   Cung cấp Web Dashboard tổng tổng hợp dữ liệu, báo cáo chuyên cần toàn trường.
*   Bàn giao tài liệu vận hành cho bộ phận IT của trường học.
