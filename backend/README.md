
---

# Hướng dẫn khởi chạy: Hệ thống điểm danh bằng khuôn mặt (Backend)

## Yêu cầu hệ thống

Trước khi chạy dự án, hãy đảm bảo máy tính của bạn đã cài đặt và khởi động các công cụ sau. Nếu chưa, vui lòng cài đặt theo hướng dẫn:

1. **Docker (Dùng để chạy cơ sở dữ liệu MySQL):**
* **Nếu chưa cài đặt:** Tải và cài đặt [Docker Desktop tại đây](https://www.docker.com/products/docker-desktop/).
* **Nếu đã cài đặt:** Hãy đảm bảo ứng dụng Docker Desktop **đang được mở và chạy ngầm** trước khi gõ lệnh. (Nếu Docker chưa chạy, terminal sẽ báo lỗi không thể kết nối đến Docker daemon).


2. **uv (Trình quản lý package Python cực nhanh):**
* **Nếu chưa cài đặt:** Mở terminal (PowerShell) và chạy lệnh sau để cài `uv`:
```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

```


* *Lưu ý: Sau khi cài, bạn có thể cần khởi động lại terminal để nhận diện lệnh `uv`.*



---

## Bước 1: Khởi chạy Database (MySQL Server)

Mở terminal, di chuyển vào thư mục `database` bên trong `backend` và sử dụng Docker Compose để tạo container.

**1. Khởi động MySQL ở chế độ chạy ngầm:**

```bash
cd ..\HeThongDiemDanhBangKhuongMat\backend\database
docker compose up -d

```

**2. (Tuỳ chọn) Kiểm tra dữ liệu bên trong MySQL:**
Để vào giao diện dòng lệnh của MySQL bên trong container vừa tạo, chạy lệnh sau:

```bash
docker exec -it ai_attendance_mysql mysql -u admin -p

```

*Lưu ý:* Khi được yêu cầu nhập mật khẩu, hãy nhập: `adminpassword` (mật khẩu sẽ không hiển thị các dấu `***` khi bạn gõ).

---

## Bước 2: Khởi chạy Backend Server (FastAPI)

Mở một tab terminal mới (hoặc dùng tab hiện tại), di chuyển về thư mục gốc `backend`.

**1. Kích hoạt môi trường ảo:**
Trên Windows (PowerShell/CMD):

```bash
cd ..\HeThongDiemDanhBangKhuongMat\backend
.\.venv\Scripts\activate

```

*(Nếu bạn dùng Linux/macOS hoặc WSL, lệnh kích hoạt sẽ là: `source .venv/bin/activate`)*

**2. Khởi chạy server Uvicorn bằng uv:**

```bash
uv run uvicorn app.main:app --reload --port 8000

```

*Cờ `--reload` giúp server tự động cập nhật lại mỗi khi bạn chỉnh sửa và lưu code.*

---

## Bước 3: Xem tài liệu và test API (Swagger UI)

Sau khi backend đã chạy thành công (Terminal báo `Application startup complete`), bạn có thể truy cập vào tài liệu đặc tả API được tạo tự động bởi FastAPI.

Mở trình duyệt và truy cập vào đường dẫn sau để xem toàn bộ danh sách API, tham số đầu vào và thực hiện test trực tiếp:
👉 **[http://localhost:8000/docs](http://localhost:8000/docs)**