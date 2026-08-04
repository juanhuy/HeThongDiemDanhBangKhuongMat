Để áp dụng cấu trúc Database mới nhất (đã thêm bảng Khoa `faculties` và Ngành `majors`) vào Docker, bạn sử dụng lại "combo lệnh" xóa sạch dữ liệu cũ và dựng lại từ đầu.

Vì file SQL của chúng ta nằm ở thư mục `init`, MySQL sẽ chỉ chạy lại nó khi cái volume lưu trữ data trống trơn. Bạn mở terminal tại thư mục chứa file `docker-compose.yml` và chạy lần lượt các lệnh sau:

**Bước 1: Tắt container và xóa sổ volume dữ liệu cũ (Rất quan trọng phải có cờ `-v`)**

```bash
docker compose down -v

```

**Bước 2: Dựng lại container để Docker tự động nạp file `01_init.sql` mới**

```bash
docker compose up -d

```

**Bước 3: Xem log để chắc chắn database đã tạo xong bảng mới mà không bị lỗi**

```bash
docker logs -f ptit_diem_danh_mysql

```

*(Đợi đến khi hiện thông báo `ready for connections` là thành công).*

---
