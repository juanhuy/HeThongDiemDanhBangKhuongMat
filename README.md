# 🎓 Hệ Thống Điểm Danh Bằng Khuôn Mặt

Hệ thống quản lý điểm danh tự động bằng nhận diện khuôn mặt (Face Recognition) cho học phần tín chỉ — tích hợp đầy đủ nghiệp vụ: **đăng ký học phần**, **điểm danh AI + điểm danh nhanh**, **xin nghỉ phép**, **báo cáo tổng kết đa cấp**, và **quản trị** (sinh viên, giảng viên, môn học, lớp tín chỉ, lịch học).

> Đồ án tốt nghiệp CNTT — xây dựng trên **FastAPI + React** với lõi AI **InsightFace** chống giả mạo (liveness).

---

## ✨ Tính năng chính

### 1. Điểm danh bằng khuôn mặt (AI)
- Nhận diện khuôn mặt theo thời gian thực (webcam) với **InsightFace** (`buffalo_l`).
- **Chống giả mạo (Liveness)**: mô hình Silent-Face + phân tích kết cấu ảnh, có cấu hình ngưỡng.
- Đánh giá trạng thái theo giờ học: **Đúng giờ / Đi muộn / Vắng không phép**.
- Cooldown chống quét lặp, giữ kết quả điểm danh đầu tiên.

### 2. Đăng ký học phần (9 quy tắc + trùng lịch)
Đợt đăng ký mở/đóng · lớp đang mở · đúng học kỳ/niên khóa · sĩ số tối đa · học vụ sinh viên · đúng khóa · **chống trùng môn** · **đủ môn tiên quyết** · giới hạn tín chỉ · **không trùng lịch học**.

### 3. Nghỉ phép
- SV nộp đơn **trước giờ học** (chặn nộp muộn) và chỉ cho **lớp mình đang học**.
- GV duyệt/từ chối; **không ghi đè** buổi sinh viên đã có mặt (tránh hạ điểm oan).

### 4. Báo cáo tổng kết (6 cấp + Excel)
| Cấp | Mô tả | Ai xem |
|---|---|---|
| Cá nhân sinh viên | Điểm chuyên cần từng lớp, cảnh báo cấm thi | SV (mình) / GV (SV trong lớp mình) / Admin |
| Lớp tín chỉ | Chi tiết từng SV + xuất Excel | GV (lớp mình dạy) / Admin |
| Giảng viên | Tổng hợp các lớp của GV | GV (chỉ mình) / Admin |
| Môn học | Gộp các lớp cùng môn | GV (lớp mình dạy) / Admin |
| Khóa / Lớp HC / Khoa | Tổng hợp theo nhóm | **Admin** |
| Toàn hệ thống | Thống kê chung + danh sách SV cấm thi | **Admin** |

Tất cả cấp đều có **tìm kiếm, phân trang, xuất Excel**.

### 5. Quản trị
CRUD đầy đủ + **audit trail** cho: sinh viên, giảng viên, môn học, lớp tín chỉ, lịch học. Import/export sinh viên qua Excel.

### 6. Bảo mật
- Mật khẩu **bcrypt** (tự nâng cấp hash cũ khi đăng nhập).
- **Rate-limit** đăng nhập chống brute-force.
- Upload ảnh an toàn (kiểm tra magic bytes, giới hạn kích thước, chống path traversal).
- Ảnh khuôn mặt **không serve công khai** — phục vụ qua endpoint có token.
- Phân quyền **chặt ở backend** (SV < GV < Admin), token JWT, tự logout khi hết hạn.

---

## 🧱 Kiến trúc & Công nghệ

```
┌─────────────────┐        ┌──────────────────────────────┐
│   React + Vite  │  HTTP  │   FastAPI (backend)           │
│   (frontend)    │ ─────► │   - Routers API               │
│   :5173         │  JWT   │   - Nghiệp vụ (ORM SQLAlchemy)│
└─────────────────┘        │   - Lõi AI (InsightFace+FAISS)│
                           │   - Liveness (ONNX)           │
                           └──────────────┬───────────────┘
                                          │
                                 ┌────────▼────────┐
                                 │  MySQL (utf8mb4) │
                                 └─────────────────┘
```

| Tầng | Công nghệ |
|---|---|
| Frontend | React 18, Vite, lucide-react, API client có token |
| Backend | Python, FastAPI, SQLAlchemy, pydantic, uvicorn |
| AI | InsightFace (`buffalo_l`), FAISS (chỉ mục vector), ONNX (liveness) |
| Database | MySQL 8 (`utf8mb4_unicode_ci`), FK CASCADE, index tối ưu |
| Bảo mật | JWT, bcrypt, rate-limit, upload validate |

---

## 🚀 Cài đặt & Chạy

### Yêu cầu
- Python 3.11+ (dự án dùng `.venv`)
- Node.js 18+
- MySQL 8 đang chạy (host/port/user/pass cấu hình qua `.env`)

### Bước 1 — Cấu hình bí mật (`.env`)

```bash
cd config
cp .env.example .env    # rồi sửa giá trị DB password, JWT secret...
```

Nội dung `.env` (bắt buộc có `DB_PASSWORD`):
```ini
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=ptit_diem_danh
DB_ENCRYPTION_KEY=...
JWT_SECRET_KEY=change_me
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=480
```

### Bước 2 — Khởi tạo database
```sql
CREATE DATABASE IF NOT EXISTS ptit_diem_danh CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Các bảng được **tự tạo** khi backend khởi động (kèm auto-migration cột).

### Bước 3 — Chạy backend
```bash
# Linux/macOS
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
# (chạy từ thư mục backend/)
```
Swagger UI: http://127.0.0.1:8000/docs

### Bước 4 — Seed dữ liệu demo (tùy chọn)
```bash
.venv/bin/python seed_demo.py
```

### Bước 5 — Chạy frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

---

## 👤 Tài khoản demo

| Vai trò | Tài khoản | Mật khẩu |
|---|---|---|
| Admin | `admin` | `123456` |
| Giảng viên | `giangvien` | `123456` |
| Sinh viên | `N22DCCN160` | `123456` |

---

## 📂 Cấu trúc thư mục

```
.
├── backend/
│   ├── app/
│   │   ├── api/endpoints/   # Router FastAPI (auth, credit_classes, ai, admin_*, demo...)
│   │   ├── core/            # Bảo mật, rate-limit, upload, audit, báo cáo, trạng thái SV
│   │   ├── crud/            # Tầng truy cập dữ liệu
│   │   ├── db/              # Session SQLAlchemy
│   │   ├── models/          # ORM models
│   │   ├── schemas/         # Pydantic schemas
│   │   └── services/        # Demo controls
│   └── tests/               # Bộ test tự động (pytest)
├── config/
│   ├── config.yaml          # Cấu hình AI, attendance, registration, demo...
│   ├── .env.example         # Mẫu biến môi trường (bí mật)
│   └── settings.py          # Đọc config + env override
├── core/                    # Lõi AI (face_analysis, liveness, faiss)
├── frontend/
│   └── src/
│       ├── api/client.js    # apiFetch: gắn token, xử lý 401
│       ├── hooks/           # useAttendanceStore (state + nghiệp vụ)
│       ├── components/      # App, Login, Header, Sidebar, Toast, AuthImage...
│       │   └── attendance/  # AdminTabs, LecturerTabs, StudentTabs, CameraMonitor
│       └── styles/
├── seed_demo.py             # Seed dữ liệu demo (idempotent)
└── requirements.txt
```

---

## 🔌 API tổng quan

| Nhóm | Endpoint chính |
|---|---|
| Xác thực | `POST /api/auth/login`, `register`, `change-password`, `GET/POST /api/auth/notifications` |
| Đăng ký | `POST /api/sinh_vien_lop_tin_chi`, `DELETE .../{ma_lop_tc}/{mssv}`, `POST .../bulk_administrative` |
| Điểm danh | `POST /api/recognize`, `POST /api/teacher/manual_checkin`, `DELETE /api/attendance/{id}` |
| Nghỉ phép | `POST /api/student/leave_request`, `GET /api/student/leave_requests`, `POST /api/teacher/approve_leave|reject_leave` |
| Báo cáo | `GET /api/reports/attendance`, `/reports/lecturer`, `/reports/subject`, `/reports/student`, `/admin/reports/faculty`, `/admin/reports/summary` (+ `/export` cho mỗi cấp) |
| Quản trị | `/api/admin/students`, `/api/admin/lecturers`, `/api/subjects`, `/api/lop_tin_chi`, `/api/lich_hoc_chi_tiet`, `/api/admin/demo/controls` |
| AI | `POST /api/recognize`, `POST /api/register`, `GET /api/images/{filename}` |

Chi tiết đầy đủ: **http://127.0.0.1:8000/docs** (Swagger UI).

---

## 🔒 Phân quyền xem báo cáo

| Cấp báo cáo | Sinh viên | Giảng viên | Admin |
|---|---|---|---|
| Cá nhân SV | ✅ mình | ✅ SV trong lớp mình | ✅ mọi SV |
| Lớp tín chỉ | ❌ | ✅ lớp mình dạy | ✅ |
| Giảng viên | ❌ | ✅ chỉ mình | ✅ |
| Môn học | ❌ | ✅ lớp mình dạy | ✅ |
| Khóa/Lớp HC/Khoa | ❌ | ❌ | ✅ |
| Toàn hệ thống | ❌ | ❌ | ✅ |

---

## 🧪 Kiểm thử

Bộ test tự động (pytest, chạy vào backend thật):

```bash
# 1. Đảm bảo backend đang chạy tại :8000
# 2. Chạy test
cd backend
../.venv/bin/python -m pytest tests/ -v
```

Bao phủ: xác thực (login, rate-limit, đổi mật khẩu), quy tắc đăng ký (trùng môn, sĩ số, khóa, học kỳ), điểm danh & nghỉ phép (ràng buộc thuộc lớp), báo cáo & phân quyền (403), xuất Excel.

---

## 🧰 Bảng điều khiển Demo (linh hoạt khi test)

Admin vào **"Bảng điều khiển Demo"** bật/tắt từng quy tắc để nới/chặt:
- Bỏ qua đợt đăng ký / học kỳ / sĩ số / tiên quyết / giới hạn tín chỉ / học vụ & khóa / trùng môn
- Cho phép hủy đăng ký dù đã điểm danh
- Cho phép nộp đơn nghỉ sau giờ học
- Cho phép duyệt đơn ghi đè buổi có mặt

---

## 📌 Lộ trình nâng cấp (khuyến nghị)
- Refresh token + quên mật khẩu
- Chuyển migration sang **Alembic**
- Dockerize toàn bộ (docker-compose: MySQL + backend + frontend)
- Liveness đa khung hình / thử thách động
- Notification realtime (WebSocket)

---

*Dự án đồ án tốt nghiệp — Hệ thống Điểm Danh Bằng Khuôn Mặt. © 2026*
