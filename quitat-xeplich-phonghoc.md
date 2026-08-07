# Nâng cấp & Hoàn thiện Tab Xếp lịch Tự động

Mục tiêu: Hoàn thiện chức năng xếp lịch tự động với các tiêu chí chuyên sâu (tránh ca đêm, chọn học kỳ/khoa), bổ sung thống kê phòng học, xuất file báo cáo (CSV/Excel) và đồng bộ thiết kế giao diện.

## User Review Required

- **Thuật toán tránh ca đêm**: Backend sẽ được cấu hình thành 2 vòng quét (2 passes). Vòng 1: Cố gắng rải hết tất cả các buổi học vào Ca Sáng và Ca Chiều trong vòng 90 ngày. Nếu rải xong vòng 1 mà vẫn thiếu buổi (hết phòng), Vòng 2 sẽ quay lại từ ngày bắt đầu và lấp chỗ trống bằng Ca Tối.
- **Xuất báo cáo Excel**: Do project không cài đặt thư viện `xlsx` hoặc `file-saver`, hệ thống sẽ xuất ra file định dạng **CSV (hỗ trợ UTF-8 BOM)**. File này có thể mở trực tiếp bằng Microsoft Excel và hiển thị Tiếng Việt hoàn hảo. Nếu bạn bắt buộc cần định dạng `.xlsx`, bạn sẽ cần cho phép cài đặt thêm package `xlsx`.

## Open Questions

Không có.

## Proposed Changes

---

### Backend Components

#### [MODIFY] [schedules.py](file:///d:/test/HeThongDiemDanhBangKhuongMat/backend/app/api/endpoints/schedules.py)
- Thêm thuộc tính `avoid_evening_shift: bool = True` vào `AdvancedAutoSuggestRequest`.
- Sửa lại vòng lặp của thuật toán `advanced_auto_suggest_schedule`. Áp dụng 2 vòng quét:
  - **Vòng 1 (Sáng/Chiều)**: Quét qua các ngày, chỉ kiểm tra ca 1 và ca 3.
  - **Vòng 2 (Tối)**: Nếu `avoid_evening_shift = True` và chưa xếp đủ số buổi, quay lại ngày bắt đầu và quét tiếp nhưng chỉ kiểm tra ca 5 (Ca tối).

---

### Frontend Components

#### [MODIFY] [creditClasses.js](file:///d:/test/HeThongDiemDanhBangKhuongMat/frontend/src/api/creditClasses.js)
- Sửa đổi hàm `advancedAutoSuggestSchedule` để truyền thêm tham số `avoid_evening_shift`.

#### [NEW] [classrooms.js](file:///d:/test/HeThongDiemDanhBangKhuongMat/frontend/src/api/classrooms.js) (hoặc thêm vào client API hiện có)
- Viết hàm `listClassrooms()` để gọi API `/api/admin/classrooms` lấy toàn bộ danh sách phòng học.

#### [MODIFY] [AutoScheduleTab.jsx](file:///d:/test/HeThongDiemDanhBangKhuongMat/frontend/src/components/admin/CreditClassesManagement/AutoScheduleTab.jsx)
- **State Initialization**: Sử dụng `useEffect` để gán giá trị mặc định cho Dropdown "Học kỳ" và "Khoa" khi dữ liệu từ Props truyền xuống.
- **Form Defaults**: Thay đổi giá trị khởi tạo số tiết Lý thuyết và Thực hành thành 15.
- **Thống kê Phòng học**: Gọi API `listClassrooms()` khi component mount, đếm và hiển thị 3 chỉ số: Tổng phòng Lý thuyết (Sẵn sàng / Bảo trì) và Tổng phòng Thực hành.
- **Giao diện đồng bộ**: Căn giữa các cột, thêm CSS (màu nền pastel nhạt, bo góc, bóng mờ) đồng bộ với bảng của Tab Phân công Giảng viên.
- **Tính năng Xuất Excel (CSV)**: Bổ sung một nút "Xuất Excel". Khi ấn, dữ liệu `scheduleResults` được chuyển đổi thành chuỗi định dạng CSV có ký tự BOM và tải về máy.
- **Checkbox Ca Đêm**: Thêm checkbox "Tránh xếp lịch ca đêm (trừ khi hết phòng sáng/chiều)" và liên kết với state form.

#### [MODIFY] [index.jsx](file:///d:/test/HeThongDiemDanhBangKhuongMat/frontend/src/components/admin/CreditClassesManagement/index.jsx)
- Đảm bảo truyền dữ liệu `faculties` hoặc `majors` xuống `AutoScheduleTab` để hiển thị đúng danh sách dropdown Khoa.

## Verification Plan

### Manual Verification
- Truy cập Tab Xếp lịch tự động.
- Chọn học kỳ, kiểm tra dropdown Khoa đã load đầy đủ dữ liệu thật.
- Kiểm tra các ô Số tiết Lý thuyết / Thực hành đã mặc định là 15.
- Kiểm tra khối "Thống kê Phòng học" hiển thị đúng số phòng đang có trong cơ sở dữ liệu.
- Chạy thuật toán với tùy chọn "Tránh ca đêm", kiểm tra lịch sinh ra ưu tiên Sáng/Chiều (Ca 1 & Ca 3).
- Nhấn "Xuất Excel" và mở file tải về xem có hiển thị chuẩn bảng mã Tiếng Việt không.
