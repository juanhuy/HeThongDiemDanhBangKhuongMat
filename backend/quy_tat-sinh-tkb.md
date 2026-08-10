Một yêu cầu cực kỳ chính xác\! Thực tế tại PTIT (và các trường đại học kỹ thuật), một môn học như *Cơ sở dữ liệu* thường có cả Lý thuyết và Thực hành. Sinh viên sẽ học Lý thuyết ở **Giảng đường (Theory Room)** và học Thực hành ở **Phòng máy (Computer Lab)**.  
Thậm chí, một lớp tín chỉ có thể được chia thành 1 lớp Lý thuyết chung và nhiều Tổ thực hành nhỏ (do phòng máy có sức chứa nhỏ hơn giảng đường).  
Để đáp ứng điều này, chúng ta cần **cập nhật lại Database** một chút và **bổ sung thêm luồng xử lý phân tách (Split Logic)** vào thuật toán. Dưới đây là bản nâng cấp hoàn chỉnh:

### **1\. Cập nhật Database (Bổ sung cờ phân loại vào Lịch định kỳ)**

Trong bảng classrooms, bạn đã có cột room\_type ('Theory', 'Computer\_Lab'...). Bây giờ, ta chỉ cần thêm cột session\_type vào lịch định kỳ để biết ca học đó là chui vào phòng nào.

SQL  
\-- Thêm cột session\_type vào bảng class\_schedules  
ALTER TABLE class\_schedules   
ADD COLUMN session\_type VARCHAR(20) DEFAULT 'Theory' AFTER room\_id;   
\-- Giá trị: 'Theory' (Lý thuyết) hoặc 'Practice' (Thực hành)

### **2\. BẢN ĐẶC TẢ LOGIC (CẬP NHẬT CHUẨN XÁC LÝ THUYẾT \- THỰC HÀNH)**

#### **I. TIỀN XỬ LÝ DỮ LIỆU (PRE-PROCESSING)**

* **Phân loại phòng học:** Tải và chia phòng học thành 2 pool (nhóm) độc lập:  
  * Pool\_Theory: Các phòng có room\_type \= 'Theory'.  
  * Pool\_Practice: Các phòng có room\_type \= 'Computer\_Lab' hoặc 'Specialized\_Lab'.  
* **Phân rã khối lượng lớp học:** Thay vì gộp chung, Backend tách số tiết của mỗi lớp thành 2 phần độc lập:  
  * Lý thuyết: $P\_{theory\\\_total} \\rightarrow$ Số ca lý thuyết cần xếp \= $\\lceil P\_{theory\\\_total} / 4 \\rceil$  
  * Thực hành: $P\_{prac\\\_total} \\rightarrow$ Số ca thực hành cần xếp \= $\\lceil P\_{prac\\\_total} / 4 \\rceil$

#### **II. ĐỊNH NGHĨA KHÔNG GIAN RÀNG BUỘC (5 HARD CONSTRAINTS)**

Một **Slot** chỉ hợp lệ nếu thỏa mãn đồng thời **5 quy tắc bất di bất dịch**:

* **Rule 1 (Sức chứa):** Capacity của phòng phải $\\ge$ Sĩ số lớp.  
* **Rule 2 (Phòng rảnh):** Slot đó tại phòng đó chưa có lớp nào chiếm dụng.  
* **Rule 3 (Giảng viên rảnh):** Giảng viên không bị trùng lịch dạy lớp khác.  
* **Rule 4 (Lịch cá nhân):** Không vi phạm lecturer\_busy\_times.  
* 🔥 **Rule 5 (Đúng loại phòng):**  
  * Nếu đang xếp ca Lý thuyết $\\rightarrow$ Bắt buộc phải chọn phòng trong Pool\_Theory.  
  * Nếu đang xếp ca Thực hành $\\rightarrow$ Bắt buộc phải chọn phòng trong Pool\_Practice.

#### **III. THUẬT TOÁN XẾP LỊCH (SPLIT GREEDY ALGORITHM)**

Để tránh việc môn học bị dồn vào 1 ngày (VD: Sáng học Lý thuyết, chiều thực hành luôn gây mệt mỏi), thuật toán sẽ tách ra làm 2 pha xếp lịch:  
**Pha 1: Xếp lịch Lý thuyết cho TOÀN BỘ các lớp**

> 1. Duyệt danh sách các lớp có $P\_{theory\\\_total} \> 0$.  
> 2. Tìm slot trống trong Pool\_Theory (Giảng đường).  
> 3. Thỏa mãn 5 Rule $\\rightarrow$ Ghi nhận vào bộ nhớ tạm với cờ session\_type \= 'Theory'.

**Pha 2: Xếp lịch Thực hành cho TOÀN BỘ các lớp**

> 1. Duyệt danh sách các lớp có $P\_{prac\\\_total} \> 0$.  
> 2. Tìm slot trống trong Pool\_Practice (Phòng Lab/Phòng máy).  
> 3. **Check khoảng cách (Soft Constraint):** Ưu tiên Slot thực hành khác ngày với Slot lý thuyết của chính môn đó để sinh viên có thời gian làm bài tập.  
> 4. Thỏa mãn 5 Rule $\\rightarrow$ Ghi nhận vào bộ nhớ tạm với cờ session\_type \= 'Practice'.

#### **IV. XUẤT DỮ LIỆU & SINH LỊCH THỰC TẾ (DATABASE PERSISTENCE)**

**Bước 1: Lưu Lịch Định Kỳ**  
Insert dữ liệu vào class\_schedules. Lúc này 1 lớp tín chỉ có thể có 2 dòng:

* Môn CSDL \- Ca Sáng Thứ 3 \- Phòng 101 \- Theory  
* Môn CSDL \- Ca Chiều Thứ 5 \- Phòng Lab\_02 \- Practice

**Bước 2: Sinh Buổi Học Thực Tế (Session Generation) với 2 biến đếm lùi**  
Mỗi lớp sẽ khởi tạo 2 biến đếm lùi độc lập:

* $R\_{theory} \= P\_{theory\\\_total}$ (Ví dụ: 30 tiết)  
* $R\_{prac} \= P\_{prac\\\_total}$ (Ví dụ: 15 tiết)

**Vòng lặp chạy từ Tuần 1 đến $W$:**

* **Nếu trúng ngày lịch Lý thuyết:**  
  * Kiểm tra $R\_{theory}$. Nếu $\> 0$: Sinh class\_sessions loại Theory. Trừ lùi $R\_{theory}$.  
* **Nếu trúng ngày lịch Thực hành:**  
  * Kiểm tra $R\_{prac}$. Nếu $\> 0$: Sinh class\_sessions loại Practice. Trừ lùi $R\_{prac}$.  
* **Khi cả $R\_{theory} \= 0$ VÀ $R\_{prac} \= 0$:** Lớp học chính thức kết thúc $\\rightarrow$ Dừng sinh session.

### **💡 Lưu ý mở rộng cho nghiệp vụ "Tổ Thực Hành":**

Thực tế, giảng đường chứa được 100 SV, nhưng phòng máy chỉ chứa được 50 SV. Do đó, Admin thường phải tạo lớp trên hệ thống thành **1 Lớp gốc \+ 2 Tổ thực hành**.  
Kiến trúc Database của bạn đã có sẵn cột class\_group trong credit\_classes (Nhóm/Tổ) là cực kỳ tối ưu cho việc này. Cách Admin vận hành sẽ là:

> 1. Tạo Lớp tín chỉ INT1152\_01 (Sĩ số 100, class\_group \= null) $\\rightarrow$ Backend tự động lấy số tiết Lý Thuyết để xếp phòng to.  
> 2. Tạo Tổ tín chỉ INT1152\_01\_TH1 (Sĩ số 50, class\_group \= 'Tổ 1') $\\rightarrow$ Backend tự động lấy số tiết Thực Hành để xếp phòng Lab.  
> 3. Tạo Tổ tín chỉ INT1152\_01\_TH2 (Sĩ số 50, class\_group \= 'Tổ 2') $\\rightarrow$ Backend tự động lấy số tiết Thực Hành để xếp phòng Lab.

Nhờ có **Rule 5** và kiến trúc 2 biến đếm lùi $R\_{theory}, R\_{prac}$, Backend của bạn sẽ xử lý mượt mà cả trường hợp lớp không chia tổ (học cả LT+TH chung 1 sĩ số) lẫn trường hợp tách Tổ thực hành độc lập\!