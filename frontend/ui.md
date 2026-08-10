Để thiết kế một giao diện Admin (Back-office) quản lý lớp tín chỉ vừa trực quan, vừa phản ánh đúng cấu trúc CSDL (Nhóm - Tổ) mà chúng ta đã chốt, bạn cần thay đổi tư duy từ "nhập từng dòng" sang "nhập theo cụm" (Wizard/Dynamic Form).

Dưới đây là bản thiết kế UX/UI cho 2 nghiệp vụ chính: **Tạo mới** và **Xem danh sách**.

---

## 1. Giao diện: Tạo Lớp Tín Chỉ (Nghiệp vụ Mở lớp)

Vì một môn học có thể sinh ra cả Nhóm (Lý thuyết) và nhiều Tổ (Thực hành) cùng lúc, giao diện không nên là một form tĩnh nhàm chán. Nên thiết kế theo dạng **Wizard (Từng bước)** hoặc **Form Động (Dynamic Form)**.

### 📌 Khu vực 1: Thông tin chung (Bước 1)

Admin sẽ chọn những thông tin bao quát nhất.

* **Học kỳ:** Dropdown (VD: Học kỳ 1 - 2026-2027)
* **Môn học:** Combobox tìm kiếm (VD: gõ `INT1332`, hệ thống đổ ra `INT1332 - Xử lý ảnh (3TC: 2 LT - 1 TH)`).
* **Tuần học:** Từ tuần [ 1 ] đến tuần [ 15 ].

👉 *Logic UI tự động:* Ngay khi Admin chọn môn `INT1332`, Frontend (Vue/React) sẽ kiểm tra data môn học này. Vì có tín chỉ thực hành, UI tự động hiển thị Khu vực 2 (Chia Nhóm & Tổ). Nếu môn chỉ có Lý thuyết (như Triết học), UI ẩn phần chia Tổ.

### 📌 Khu vực 2: Cấu hình Nhóm & Tổ (Bước 2)

Thay vì bắt Admin tạo Nhóm 01, rồi lại tạo Tổ 1, Tổ 2 riêng lẻ, hãy cho phép họ tạo tất cả trong 1 màn hình bằng các khối (Cards).

> **[ KHỐI: NHÓM 01 ]**
> * **Giảng viên Lý thuyết:** [ Dropdown chọn GV ]
> * **Sĩ số tối đa:** [ 100 ]
> * **Lớp biên chế dự kiến (Phân luồng):** [ Multi-select: `D22CQCNMT01-N` ❌, `D22CQCN02-N` ❌ ]
> 
> 
> ↳ **CÁC TỔ THỰC HÀNH CỦA NHÓM 01:**
> * **Tổ 1:** Giảng viên TH: [ Chọn GV ] | Sĩ số: [ 35 ]  [ Nút: Xóa Tổ ]
> * **Tổ 2:** Giảng viên TH: [ Chọn GV ] | Sĩ số: [ 35 ]  [ Nút: Xóa Tổ ]
> * **Tổ 3:** Giảng viên TH: [ Chọn GV ] | Sĩ số: [ 30 ]  [ Nút: Xóa Tổ ]
> * *➕ [Thêm Tổ thực hành]*
> 
> 
> *[ Nút: ➕ Thêm Nhóm Mới (Sẽ sinh ra Nhóm 02) ]*

**💡 UX/UI Tips cho Backend khi Admin bấm [LƯU TẤT CẢ]:**

* Backend nhận 1 cục JSON bự.
* Tự động phát sinh `class_id` (VD: `INT1332_N01`, `INT1332_N01_T01`).
* Tự động lưu bảng `expected_class_mappings` cho Nhóm 01 với các lớp `D22CQ...`.
* Tự động gán `class_type = 'Theory'` cho Nhóm và `'Practice'` cho Tổ.

---

## 2. Giao diện: Quản lý & Danh sách Lớp Tín Chỉ

Màn hình này giúp Admin bao quát toàn bộ các lớp đã mở, theo dõi tiến độ đăng ký và chỉnh sửa nếu cần.

### 📌 Khu vực 1: Bộ lọc (Filter Bar)

Nằm ở trên cùng, giúp Admin tìm kiếm nhanh:

* **Học kỳ:** [ Học kỳ 1 - 2026-2027 ▾ ]
* **Khoa/Bộ môn:** [ Công nghệ thông tin ▾ ]
* **Môn học:** [ Tất cả môn học ▾ ]
* **Lớp dự kiến:** [ Nhập mã lớp... ] (Để tìm nhanh xem lớp D22CQCNMT01-N đã được mở những môn nào).
* **Nút:** [ 🔍 Lọc ]  |  [ ➕ Tạo Lớp Mới ]

### 📌 Khu vực 2: Bảng dữ liệu (Data Table)

Đây là phần cốt lõi. Để thể hiện rõ cấu trúc Cha - Con (Nhóm - Tổ), bạn nên dùng **TreeTable** (Bảng có thể mở rộng dòng) thay vì một bảng phẳng thông thường.

| Mã Lớp TC | Tên Môn Học | Nhóm - Tổ | Phân Loại | Giảng viên | Sĩ số | Lớp dự kiến | Trạng thái | Thao tác |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **▼ INT1332_N01** | Xử lý ảnh | **Nhóm 01** | Lý thuyết | Thầy A | 85/100 | D22CQCNMT01-N... | 🟢 Đang mở | [Sửa] [Hủy] |
| ↳ *INT1332_N01_T1* | *Xử lý ảnh* | *Tổ 1* | *Thực hành* | *Thầy B* | *30/35* | *(Theo Nhóm 01)* | *🟢 Đang mở* | *[Sửa]* |
| ↳ *INT1332_N01_T2* | *Xử lý ảnh* | *Tổ 2* | *Thực hành* | *Cô C* | *35/35* | *(Theo Nhóm 01)* | *🔴 Đã Đầy* | *[Sửa]* |
| ↳ *INT1332_N01_T3* | *Xử lý ảnh* | *Tổ 3* | *Thực hành* | *Thầy D* | *20/30* | *(Theo Nhóm 01)* | *🟢 Đang mở* | *[Sửa]* |
| **▶ INT1332_N02** | Xử lý ảnh | **Nhóm 02** | Lý thuyết | Thầy A | 50/50 | D22CQDT01-N | 🔴 Đã Đầy | [Sửa] [Hủy] |
| **▶ BAS1106_N01** | GD Thể chất | **Nhóm 01 - Tổ 1** | Chung | Cô E | 75/80 | D26CQVT... | 🟢 Đang mở | [Sửa] [Hủy] |

**💡 Tính năng của Table:**

* **Nút ▼ / ▶:** Cho phép Admin bấm vào Nhóm để xổ ra (hoặc thu gọn) các Tổ thực hành bên dưới, giúp bảng không bị rối mắt.
* **Trạng thái:** Dùng màu sắc (Badge) để Admin lướt nhanh thấy lớp nào `Đang mở`, lớp nào `Đã đầy`, lớp nào đang `Dự kiến` (chưa cho SV đăng ký).
* **Thao tác:** Bấm [Sửa] sẽ mở ra một Modal (Popup) để Admin cập nhật nhanh Giảng viên hoặc Sĩ số tối đa. Bấm [Hủy] để chuyển status thành `Cancelled` (nếu ít SV đăng ký).

---
