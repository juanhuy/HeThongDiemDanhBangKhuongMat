# 🐳 Docker — Hệ Thống Điểm Danh Bằng Khuôn Mặt

Triển khai full-stack bằng Docker Compose (MySQL + Backend + Frontend).
**Chạy tách biệt hoàn toàn với hệ thống native** — không xung đột cổng, không ảnh hưởng dữ liệu hiện tại.

## Các cổng (tách biệt với native)

| Service | Docker | Native (đang chạy) |
|---|---|---|
| Frontend | `http://localhost:5174` | `http://localhost:5173` |
| Backend API | `http://localhost:8001` | `http://localhost:8000` |
| MySQL | `127.0.0.1:3307` | `127.0.0.1:3306` |

## Cách chạy

```bash
# 1. Build + khởi động (lần đầu mất vài phút để cài dependency)
docker compose up -d --build

# 2. Mở trình duyệt
#    http://localhost:5174
#    Đăng nhập:  admin / 123456
#                giangvien / 123456
#                N22DCCN160 / 123456
```

Khi khởi động lần đầu, backend tự động:
1. Tạo toàn bộ bảng (từ SQLAlchemy models — KHÔNG dùng file .sql cũ)
2. Seed dữ liệu demo nếu bảng `accounts` trống
3. Seed khuôn mặt demo (từ ảnh có sẵn) nếu chưa có face vector

## Cấu hình tùy chọn

Tạo file `.env` cạnh `docker-compose.yml` để đổi mật khẩu/secret:

```ini
MYSQL_ROOT_PASSWORD=19082004
MYSQL_USER=app
MYSQL_PASSWORD=app123456
DB_ENCRYPTION_KEY=doithenaytruoc-khiencuathoisuynghi
JWT_SECRET_KEY=doithenaytruoc-khiencuathoisuynghi2
```

## Lệnh quản lý

```bash
docker compose ps                 # trạng thái
docker compose logs -f backend    # xem log backend
docker compose down               # dừng (GIỮ dữ liệu trong volume)
docker compose down -v            # dừng + XÓA toàn bộ dữ liệu
docker compose up -d              # chạy lại (dữ liệu vẫn còn)
```

## Dữ liệu lưu ở đâu

| Dữ liệu | Volume |
|---|---|
| MySQL | `mysql_data` |
| Ảnh khuôn mặt đã đăng ký | `registered_images` |
| Embeddings | `face_database` |
| Tài liệu đã upload | `documents` |
| Log điểm danh | `logs` |

Xóa volume (`down -v`) → lần `up` sau sẽ re-init DB + seed lại từ đầu.

## ⚠️ Lưu ý

- **Chạy CPU**: image dùng CPU (không cần GPU). InsightFace tự fallback CPU — chậm hơn bản native có CUDA một chút, nhưng vẫn đủ demo.
- **Camera từ trình duyệt**: mở `http://localhost:5174` bằng trình duyệt có webcam trên **cùng máy chạy backend** (WebRTC qua HTTP local). Nếu mở từ máy khác trong LAN, dùng `http://<IP-máy>:5174` — camera sẽ là camera của máy đang mở trình duyệt.
- **Không dùng chung DB**: volume MySQL của Docker là bản riêng biệt, không đụng DB native `ptit_diem_danh` trên `3306`.
