



> **Vai trò:** Bạn là một Frontend Developer / UI-UX Expert giàu kinh nghiệm. Hãy giúp tôi xây dựng giao diện Quản lý Lớp tín chỉ cho một hệ thống Đại học.
> **Ngữ cảnh Nghiệp vụ (Domain Knowledge):**
> Trong hệ thống đào tạo tín chỉ, khi số lượng sinh viên đông, một môn học sẽ được chia thành:
> * **Nhóm (Theory):** Dùng để học Lý thuyết ở giảng đường lớn (VD: Nhóm 01 - 100 SV).
> * **Tổ (Practice):** Là các nhóm nhỏ thuộc 1 Nhóm lớn, dùng để học Thực hành ở phòng máy (VD: Tổ 1, Tổ 2, Tổ 3 thuộc Nhóm 01 - mỗi tổ 30-40 SV).
> 
> 
> Hệ thống Backend đã cung cấp API hỗ trợ tính toán bán tự động (Semi-Automated). Tôi cần bạn tạo các giao diện sau bằng  ReactJS với Ant Design với Tailwind & Shadcn UI]**.
> ### Yêu cầu Giao diện chi tiết:
> 
> 
> #### 1. Màn hình Danh sách (Credit Class List)
> 
> 
> * **Hiển thị dạng Tree Table (Bảng phân cấp) hoặc Accordion:** Do Tổ là con của Nhóm. Khi hiển thị, mỗi dòng Nhóm (Theory) sẽ có nút Expand `(+)` để mở rộng xem các Tổ (Practice) bên trong nó.
> * **Cột hiển thị:** Mã lớp, Môn học, Giảng viên, Loại (Lý thuyết/Thực hành), Tên Nhóm/Tổ (`class_group`), Sĩ số, Trạng thái.
> * **Bộ lọc (Filter):** Học kỳ, Niên khóa, Môn học, Giảng viên.
> * Có 2 nút Action chính ở góc trên: **"Tạo lớp đơn"** và **"Tạo lớp tự động (Hàng loạt)"**.
> 
> 
> #### 2. Màn hình "Tạo lớp đơn" (Modal/Drawer cơ bản)
> 
> 
> * Dùng cho các môn chỉ có Lý thuyết hoặc quy mô siêu nhỏ.
> * Form nhập cơ bản: Chọn Môn học, Chọn Giảng viên, Học kỳ, Niên khóa, Nhóm (`class_group`), Sĩ số tối đa.
> 
> 
> #### 3. Màn hình "Tạo lớp tự động" (Tính năng cốt lõi - dạng Wizard 2 bước)
> 
> 
> Đây là tính năng giúp Admin chia Nhóm/Tổ nhanh chóng.
> **Bước 1: Khai báo thông số (Input Parameters)**
> * Form gồm:
> * Chọn Môn học, Học kỳ, Niên khóa, Chọn Giảng viên (mặc định).
> * **Tổng sinh viên dự kiến:** (Input Number, VD: 200).
> * **Sức chứa phòng Lý thuyết:** (Input Number, mặc định 100).
> * **Sức chứa phòng Thực hành:** (Input Number, mặc định 40).
> 
> 
> * Bấm nút **"Tính toán (Preview)"** -> Gọi API `POST /lop_tin_chi/preview-groups`.
> 
> 
> **Bước 2: Review & Human Override (Chỉnh sửa bản nháp)**
> * Hiển thị kết quả API trả về dưới dạng **Card Layout (Giao diện thẻ)**.
> * Mỗi "Nhóm" là 1 Card lớn. Bên trong Card lớn chứa danh sách các "Tổ" (dạng Table nhỏ hoặc list item).
> * **Yêu cầu tương tác (RẤT QUAN TRỌNG):**
> * Admin có thể ấn vào ô "Sĩ số" của Nhóm hoặc Tổ để **Edit Inline** (Sửa trực tiếp) nếu thuật toán chia chưa vừa ý.
> * Trong Card Nhóm, có nút **"+ Thêm Tổ"** để Admin tự thêm tổ nếu muốn chia nhỏ hơn nữa.
> * Có nút **"Xóa (Thùng rác)"** ở mỗi Tổ.
> 
> 
> * Dưới cùng có nút **"Xác nhận & Khởi tạo"**.
> 
> 
> **Mô tả cấu trúc JSON Payload khi ấn "Xác nhận & Khởi tạo"** gửi về API `POST /lop_tin_chi/save-draft`:
> ```json
> {
>   "subject_id": "INT1339",
>   "lecturer_id": "GV01",
>   "semester": 1,
>   "academic_year": "2024-2025",
>   "groups": [
>     {
>       "class_group": "01",
>       "max_students": 100,
>       "class_type": "Theory",
>       "sub_groups": [
>         {"class_group": "Tổ 1", "max_students": 40, "class_type": "Practice"},
>         {"class_group": "Tổ 2", "max_students": 40, "class_type": "Practice"},
>         {"class_group": "Tổ 3", "max_students": 20, "class_type": "Practice"}
>       ]
>     }
>   ]
> }
> 
> ```
> 
> 
> Hãy viết code cho các giao diện trên. Đảm bảo UI hiện đại, các trạng thái loading, error notification hiển thị đầy đủ, logic map đúng với payload JSON yêu cầu.
