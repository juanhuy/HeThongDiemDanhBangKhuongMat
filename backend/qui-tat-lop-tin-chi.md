Trong hệ thống quản lý đào tạo tín chỉ (đặc biệt là tại các trường kỹ thuật), **"Nhóm"** và **"Tổ"** giải quyết hai bài toán hoàn toàn khác nhau về quy mô và loại hình phòng học.

Dưới đây là cách phân biệt chính xác khi nào hệ thống sẽ sinh ra "Nhóm" và khi nào sinh ra "Tổ", cùng với cách ánh xạ vào Database của bạn:

### **1. Khi nào có "Nhóm" (Group)?**

Nhóm được sinh ra để **chia nhỏ tổng số sinh viên đăng ký một môn học** thành các lớp có quy mô phù hợp với giảng đường lý thuyết.

* **Nguyên nhân:** Số lượng sinh viên đăng ký môn học quá đông, một giảng đường không chứa hết.
* **Đặc điểm:**
* Các Nhóm hoạt động hoàn toàn độc lập với nhau (khác giảng viên, khác lịch học, khác ca).
* Sinh viên thuộc Nhóm nào thì chỉ học với sinh viên của Nhóm đó.


* **Ví dụ:** Môn *Cơ sở dữ liệu* có 300 sinh viên đăng ký. Giảng đường lớn nhất chứa được 100 sinh viên. Admin sẽ phải tạo ra 3 Lớp tín chỉ (Nhóm):
* Nhóm 01 (INT1152_**01**): 100 SV
* Nhóm 02 (INT1152_**02**): 100 SV
* Nhóm 03 (INT1152_**03**): 100 SV



### **2. Khi nào có "Tổ" (Sub-group / Practice Group)?**

Tổ được sinh ra để **chia nhỏ 1 Nhóm** thành các đơn vị nhỏ hơn, phục vụ riêng cho việc **học Thực hành / Thí nghiệm / Bài tập**.

* **Nguyên nhân:** Bắt nguồn từ rào cản vật lý (Hard Constraint số 1 trong mô tả của bạn). Giảng đường lý thuyết chứa được 100 sinh viên, nhưng phòng máy (Computer Lab) chỉ chứa được tối đa 40-50 máy tính.
* **Đặc điểm:**
* Tổ bị phụ thuộc vào Nhóm (thuộc về 1 Nhóm cụ thể).
* Các sinh viên khác Tổ nhưng cùng Nhóm sẽ **học chung giờ Lý thuyết** ở giảng đường lớn, nhưng sẽ **tách ra học khác giờ Thực hành** ở phòng máy.


* **Ví dụ:** Xét Nhóm 01 môn CSDL ở trên (có 100 sinh viên). Do phòng lab chỉ chứa được 50 người, hệ thống bắt buộc phải tách thành 2 Tổ:
* Nhóm 01 - **Tổ 1**: 50 SV học ca Sáng thứ 3 (Phòng Lab_01)
* Nhóm 01 - **Tổ 2**: 50 SV học ca Chiều thứ 3 (Phòng Lab_02)



---

### **3. Ánh xạ vào Database và Kiến trúc Backend**

Dựa trên cấu trúc bảng `credit_classes` mà bạn đang thiết kế, đây là cách Admin sẽ tạo dữ liệu và cách Backend phân biệt để xếp lịch:

| Mã môn học | Mã Nhóm (Lớp gốc) | Mã Tổ (`class_group`) | Sĩ số | Loại giờ học ưu tiên | Thuật toán xếp phòng vào Pool nào? |
| --- | --- | --- | --- | --- | --- |
| INT1152 | 01 | `NULL` | 100 | Lý thuyết | `Pool_Theory` (Giảng đường lớn) |
| INT1152 | 01 | `Tổ 1` | 50 | Thực hành | `Pool_Practice` (Phòng Lab) |
| INT1152 | 01 | `Tổ 2` | 50 | Thực hành | `Pool_Practice` (Phòng Lab) |

**Logic xử lý Backend (Ví dụ cho môn có 30 tiết LT, 15 tiết TH):**

1. Khi thuật toán quét thấy dòng có `class_group` là `NULL` (Nhóm gốc): Nó hiểu đây là ca Lý thuyết. Nó lấy số sinh viên là 100, lấy 30 tiết Lý thuyết đi tìm phòng rảnh trong `Pool_Theory`.
2. Khi thuật toán quét thấy dòng có `class_group` là `Tổ 1` hoặc `Tổ 2`: Nó hiểu đây là ca Thực hành. Nó lấy số sinh viên là 50, lấy 15 tiết Thực hành đi tìm phòng rảnh trong `Pool_Practice`.

### **Tóm tắt quy luật nghiệp vụ**

* **Nhóm (Group):** Dùng cho cấp độ Môn học $\rightarrow$ Quản lý học **Lý thuyết**.
* **Tổ (Sub-group):** Dùng cho cấp độ Nhóm $\rightarrow$ Quản lý học **Thực hành/Thí nghiệm**.
* Nếu một môn học chỉ có Lý thuyết (VD: Triết học, Lịch sử Đảng): Chỉ có Nhóm, không bao giờ sinh ra Tổ.
* Nếu một môn học có quy mô sinh viên quá ít (VD: chỉ có 40 người học CSDL): Sĩ số này vừa vặn với cả giảng đường lẫn phòng lab $\rightarrow$ Chỉ có Nhóm, không cần chia Tổ. Học chung cả LT và TH.


--------------------------------------------------------------------------------------------------------------------------------------
















Đây là một câu hỏi mang tính quyết định về **Mô hình Vận hành (Operations Model)**.

Trong thực tế tại Phòng Đào tạo của PTIT (và các trường Đại học lớn), việc chia Nhóm và Tổ không thể 100% nhập tay (vì quá mất thời gian), nhưng cũng không thể 100% máy tự sinh (vì máy không hiểu hết các yếu tố con người như thiếu giảng viên, lớp ghép, sinh viên học lại).

Câu trả lời chính xác nhất cho hệ thống này là: **BÁN TỰ ĐỘNG (Semi-Automated) - Hệ thống tự động tính toán và đưa ra GỢI Ý (Suggestion), Admin chỉ việc review, chỉnh sửa nhẹ và bấm "Duyệt".**

Dưới đây là cách bạn xây dựng luồng logic (Thuật toán chia lớp) cho Backend để hỗ trợ Admin một cách tối ưu nhất:

### Bước 1: Thu thập thông tin đầu vào (Admin thao tác)

Admin trên giao diện Web chọn các thông số sau:

1. **Môn học:** Kỹ thuật Lập trình (Có cả Lý thuyết & Thực hành).
2. **Khóa/Ngành mục tiêu:** Chọn các lớp biên chế khóa D22 ngành CNTT (VD: `D22CQCN01-N`, `D22CQCN02-N`, `D22CQCN03-N`).
* *Backend tự động query:* Tổng số lượng sinh viên của 3 lớp này là **180 Sinh viên**.
* *Dự trù sinh viên học lại/học vượt:* Cộng thêm 10% $\rightarrow$ Tổng dự kiến: **200 Sinh viên**.



### Bước 2: Thuật toán Tự động Tính toán & Gợi ý (Backend xử lý)

Backend sẽ đọc cấu hình sức chứa mặc định:

* Sức chứa Giảng đường (Theory): Max **100 SV/phòng**.
* Sức chứa Phòng máy (Practice): Max **40 SV/phòng**.

**Logic Toán học chia Nhóm (Lý Thuyết):**

* Số Nhóm cần thiết = `CEIL(Tổng SV dự kiến / Sức chứa Giảng đường)`
* $\rightarrow$ `CEIL(200 / 100)` = **2 Nhóm lớn**.
* $\rightarrow$ Sĩ số mỗi nhóm: 100 SV.

**Logic Toán học chia Tổ (Thực Hành) cho mỗi Nhóm:**

* Số Tổ cần thiết trong 1 Nhóm = `CEIL(Sĩ số Nhóm / Sức chứa Phòng máy)`
* $\rightarrow$ `CEIL(100 / 40)` = **3 Tổ thực hành** (mỗi tổ ~33-34 SV).

### Bước 3: Render kết quả ra màn hình cho Admin xem trước (Preview)

Giao diện Web lúc này sẽ hiển thị bản nháp (Draft) mà Backend vừa tính toán ra:

* **Nhóm 01 (Lý thuyết) - Sĩ số max 100**
* Tổ 1 (Thực hành) - Sĩ số max 40
* Tổ 2 (Thực hành) - Sĩ số max 40
* Tổ 3 (Thực hành) - Sĩ số max 40
* *Gán Lớp biên chế:* D22CQCN01-N, một nửa D22CQCN02-N


* **Nhóm 02 (Lý thuyết) - Sĩ số max 100**
* Tổ 1 (Thực hành) - Sĩ số max 40
* Tổ 2 (Thực hành) - Sĩ số max 40
* Tổ 3 (Thực hành) - Sĩ số max 40
* *Gán Lớp biên chế:* Một nửa D22CQCN02-N, D22CQCN03-N



### Bước 4: Admin Can thiệp (Human Override)

Vì sao cần Admin xem lại và sửa thủ công?

* **Trường hợp 1 (Ghép lớp hành chính):** Máy chia cắt đôi lớp D22CQCN02-N ra 2 Nhóm khác nhau. Admin thấy không hợp lý vì các em cùng lớp HC nên đi học LT cùng nhau. Admin sẽ kéo thả thủ công: Nhóm 1 chứa 01 và 02 (120 SV), Nhóm 2 chứa 03 (60 SV). Lúc này Admin tìm phòng giảng đường sức chứa 150 chỗ cho Nhóm 1.
* **Trường hợp 2 (Thiếu giáo viên):** Chỉ có 1 giảng viên dạy môn này. Nếu chia 2 Nhóm lớn thì giảng viên dạy được (2 ca), nhưng chia thành 6 Tổ thực hành thì giảng viên kiệt sức (6 ca). Admin có thể quyết định nới lỏng sức chứa phòng máy (nhét 50 em/phòng) để rút xuống còn 4 Tổ thực hành.

### Bước 5: Bấm nút "Lưu và Khởi tạo" (Database Insert)

Sau khi Admin thấy bản Preview đã hợp lý và bấm Lưu, Backend sẽ chạy 1 vòng lặp để **INSERT** hàng loạt dữ liệu vào Database của bạn như sau:

1. Insert 2 record Nhóm vào `credit_classes` (với `parent_class_id = NULL`, `class_type = 'Theory'`).
2. Trích xuất ID của 2 Nhóm vừa tạo $\rightarrow$ Insert 6 record Tổ vào `credit_classes` (với `parent_class_id = ID_Nhóm_Tương_Ứng`, `class_type = 'Practice'`).
3. Dựa trên gán ghép lớp hành chính $\rightarrow$ Insert các dòng vào bảng `class_target_audiences`.

---

### Tổng kết Nghiệp vụ

* **Quy trình chuẩn:** Backend tính toán công thức Toán học $\rightarrow$ Render bản nháp $\rightarrow$ Admin Review/Kéo thả tinh chỉnh $\rightarrow$ Lưu vào DB.
* Với tư duy này, hệ thống của bạn không bị "Cứng nhắc" (quá phụ thuộc vào máy) nhưng cũng không bắt nhân viên Đào tạo phải "Gõ từng dòng" khai báo Tổ 1, Tổ 2, Tổ 3 bằng tay (tránh sai sót con người).