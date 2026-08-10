# ĐỒ ÁN TỐT NGHIỆP

## Hệ Thống Điểm Danh Bằng Khuôn Mặt cho Học Phần Tín Chỉ

---

# MỤC LỤC

1. [Chương 1 — Mở đầu](#chương-1--mở-đầu)
2. [Chương 2 — Cơ sở lý thuyết](#chương-2--cơ-sở-lý-thuyết)
3. [Chương 3 — Phân tích & thiết kế hệ thống](#chương-3--phân-tích--thiết-kế-hệ-thống)
4. [Chương 4 — Cài đặt hệ thống](#chương-4--cài-đặt-hệ-thống)
5. [Chương 5 — Kiểm thử & đánh giá](#chương-5--kiểm-thử--đánh-giá)
6. [Chương 6 — Kết luận & hướng phát triển](#chương-6--kết-luận--hướng-phát-triển)

---

# Chương 1 — Mở đầu

## 1.1. Đặt vấn đề
Điểm danh thủ công (gọi tên) tốn thời gian, dễ sai sót và bị giả mạo (điểm danh hộ). Với quy mô lớp tín chỉ đông, nhu cầu tự động hóa điểm danh là tất yếu.

## 1.2. Mục tiêu
- Xây dựng hệ thống **điểm danh tự động bằng khuôn mặt** theo thời gian thực.
- Tích hợp đầy đủ **nghiệp vụ học vụ**: đăng ký học phần, nghỉ phép, báo cáo chuyên cần, quy định cấm thi.
- Đảm bảo **tính chính xác, bảo mật** (chống giả mạo, chống gian lận) và **dễ quản trị**.

## 1.3. Phạm vi
- **3 vai trò**: Admin, Giảng viên, Sinh viên.
- Nhận diện khuôn mặt từ webcam (browser) và ảnh tĩnh.
- Quản lý: sinh viên, giảng viên, môn học, lớp tín chỉ, lịch học, nghỉ phép, báo cáo.

---

# Chương 2 — Cơ sở lý thuyết

## 2.1. Nhận diện khuôn mặt
- **InsightFace** với backbone `buffalo_l`: phát hiện khuôn mặt (detector), căn chỉnh (alignment) và trích xuất **embedding vector 512 chiều**.
- So khớp bằng **Cosine Similarity** qua chỉ mục **FAISS** (IndexFlatIP + chuẩn hóa L2), ngưỡng `0.65`.

## 2.2. Chống giả mạo (Liveness)
- Mô hình **Silent-Face-Anti-Spoofing** (ONNX): phân loại 3 lớp Real / Print attack / Replay attack; dùng xác suất lớp Real.
- **Fallback heuristic**: phương sai Laplacian phát hiện ảnh chụp màn hình (mờ/nhiễu).
- Ngưỡng cấu hình qua `config.yaml` (`ai_threshold`, `challenge_threshold`, `heuristic_min`).

## 2.3. Bảo mật & xác thực
- **JWT (HS256)** với claims nhúng vai trò; tự động logout khi token hết hạn (401).
- **bcrypt** lưu mật khẩu; tự nâng cấp hash SHA-256 cũ khi đăng nhập.
- **Rate-limit** đăng nhập (5 lần sai/15 phút → khoá).

---

# Chương 3 — Phân tích & thiết kế hệ thống

## 3.1. Yêu cầu chức năng (tổng hợp)

| STT | Yêu cầu | Vai trò |
|---|---|---|
| 1 | Đăng ký học phần theo quy định (đợt, kỳ, sĩ số, tiên quyết, khóa, trùng môn, tín chỉ, trùng lịch) | SV, Admin |
| 2 | Điểm danh tự động bằng khuôn mặt + điểm danh nhanh | AI, GV |
| 3 | Xin nghỉ phép & duyệt (trước giờ học, đúng lớp, không hạ điểm oan) | SV, GV |
| 4 | Báo cáo tổng kết 6 cấp + xuất Excel | SV/GV/Admin |
| 5 | Quản trị CRUD sinh viên, giảng viên, môn học, lớp, lịch + audit | Admin |
| 6 | Bảng điều khiển Demo (bật/tắt quy tắc để test) | Admin |

## 3.2. Kiến trúc tổng thể
```
Frontend (React/Vite)
   │  REST API + JWT
Backend (FastAPI)
   ├─ Tầng nghiệp vụ (routers + services)
   ├─ Tầng dữ liệu (SQLAlchemy ORM)
   └─ Lõi AI (InsightFace + FAISS + Liveness ONNX)
MySQL (utf8mb4)
```

## 3.3. Thiết kế cơ sở dữ liệu (ERD)
Các bảng chính: `accounts`, `user_profiles`, `students`, `lecturers`, `subjects`, `credit_classes`, `class_schedules`, `student_class_enrollment`, `attendance_histories`, `leave_requests`, `face_features`, `notifications`, `audit_logs`, `system_settings`.

Quan hệ chính (FK + ràng buộc xóa):
- `students ──< student_class_enrollment >── credit_classes` (CASCADE)
- `credit_classes ──< class_schedules ──< attendance_histories / leave_requests` (CASCADE)
- `credit_classes → subjects` (CASCADE), `credit_classes → lecturers` (SET NULL)
- `accounts ──1:1── user_profiles ──1:1── students/lecturers`

Ràng buộc nghiệp vụ lưu trong DB/code:
- Khóa duy nhất đăng ký `(class_id, student_id)`.
- Chỉ sinh viên **thuộc lớp** mới được điểm danh/xin nghỉ.
- Điểm danh: **Đúng giờ / Đi muộn / Vắng không phép / Có phép**; cấm thi khi tỷ lệ vắng > ngưỡng cấu hình.

## 3.4. Thiết kế API
Đầy đủ tại **Swagger UI** (`/docs`). Các nhóm chính: Xác thực, Đăng ký, Điểm danh, Nghỉ phép, Báo cáo (6 cấp + export), Quản trị, AI, Demo controls.

## 3.5. Ma trận phân quyền báo cáo
| Cấp | SV | GV | Admin |
|---|---|---|---|
| Cá nhân SV | ✅ mình | ✅ SV trong lớp mình | ✅ |
| Lớp tín chỉ | ❌ | ✅ lớp mình | ✅ |
| Giảng viên | ❌ | ✅ mình | ✅ |
| Môn học | ❌ | ✅ lớp mình | ✅ |
| Khóa/Lớp HC/Khoa | ❌ | ❌ | ✅ |
| Toàn hệ thống | ❌ | ❌ | ✅ |

---

# Chương 4 — Cài đặt hệ thống

## 4.1. Môi trường
- Python 3.11+ / Node 18+ / MySQL 8 / CUDA (tùy chọn tăng tốc AI)

## 4.2. Các bước
1. Tạo DB `ptit_diem_danh` (utf8mb4).
2. Cấu hình `config/.env` (DB password, JWT secret).
3. Chạy backend: `.venv/bin/python -m uvicorn app.main:app --port 8000`
4. Seed dữ liệu demo: `.venv/bin/python seed_demo.py`
5. Chạy frontend: `cd frontend && npm run dev`

## 4.3. Cấu trúc code
- `backend/app/api/endpoints/` — Router API.
- `backend/app/core/` — Bảo mật, rate-limit, upload, audit, báo cáo, chuẩn hóa trạng thái.
- `backend/app/crud/` — truy cập dữ liệu.
- `backend/app/models/` — ORM.
- `core/` — lõi AI (face_analysis, liveness, FAISS).
- `frontend/src/hooks/useAttendanceStore.jsx` — state + nghiệp vụ UI.
- `frontend/src/components/attendance/` — các panel theo vai trò.

---

# Chương 5 — Kiểm thử & đánh giá

## 5.1. Test tự động (pytest)
Bộ test tại `backend/tests/` chạy vào backend thật:

| Nhóm | Nội dung |
|---|---|
| `test_auth.py` | login đúng/sai, rate-limit, đổi mật khẩu |
| `test_registration.py` | trùng môn, sĩ số, sai khóa, sai học kỳ |
| `test_attendance.py` | điểm danh nhanh, ràng buộc thuộc lớp, nghỉ phép |
| `test_reports.py` | báo cáo 6 cấp, phân quyền 403, xuất Excel |

```bash
cd backend && ../.venv/bin/python -m pytest tests/ -v
```

## 5.2. Kiểm thử nghiệp vụ (kết quả chính)
- ✅ Điểm danh AI nhận diện đúng + liveness chặn ảnh giả.
- ✅ Đăng ký học phần chặn đúng 9 quy tắc + trùng lịch.
- ✅ Chặn hủy đăng ký khi đã điểm danh; chặn nộp đơn nghỉ sau giờ.
- ✅ Duyệt đơn không ghi đè buổi đã có mặt (không hạ điểm oan).
- ✅ Phân quyền: SV/GV không xem được dữ liệu ngoài phạm vi (403).
- ✅ Xuất Excel 6 cấp báo cáo.
- ✅ E2E trình duyệt: 19/19 tab hoạt động, không lỗi JS.

## 5.3. Đánh giá
- **Ưu điểm**: kỹ thuật AI thực tế, nghiệp vụ đầy đủ, bảo mật tốt, báo cáo đa cấp.
- **Hạn chế**: liveness đơn khung hình; chưa có migration Alembic; cooldown lưu RAM.

---

# Chương 6 — Kết luận & hướng phát triển

## 6.1. Kết luận
Hệ thống đã đạt các mục tiêu: điểm danh tự động bằng khuôn mặt hoạt động chính xác, tích hợp đầy đủ nghiệp vụ học vụ, phân quyền chặt chẽ và có báo cáo đa cấp — sẵn sàng trình diễn thực tế.

## 6.2. Hướng phát triển
- Refresh token, quên mật khẩu.
- Liveness đa khung hình / thử thách động (chống video replay).
- Chuyển sang Alembic, đóng Docker, CI/CD.
- Thông báo realtime (WebSocket), ứng dụng di động.
- Mở rộng báo cáo theo khoa/trường, tích hợp học vụ PTIT.

---

*Tài liệu đồ án tốt nghiệp — Hệ Thống Điểm Danh Bằng Khuôn Mặt*
