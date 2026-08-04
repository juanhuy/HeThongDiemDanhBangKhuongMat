Khi Database thay đổi cấu trúc cốt lõi (chuyển từ lưu chuỗi text sang dùng ID Khóa ngoại), toàn bộ hệ sinh thái Backend của bạn cũng phải "thay máu" theo để không bị lỗi `Unknown column` hay `Invalid keyword argument` như ban nãy.

Dưới đây là **Tổng hợp toàn bộ Checklist 4 bước** bạn cần phải sửa trong source code Backend (FastAPI + SQLAlchemy) và Data Import:

---

### 1. Tạo mới 2 Model (SQLAlchemy) và Schema (Pydantic)

Bạn cần tạo thêm 2 file/class mới trong Backend để quản lý bảng Khoa và Ngành.

* **Tạo Model SQLAlchemy:**
```python
class Faculty(Base):
    __tablename__ = "faculties"
    faculty_id = Column(String(20), primary_key=True)
    faculty_name = Column(String(150), unique=True, nullable=False)
    dean_id = Column(String(20), ForeignKey("lecturers.lecturer_id"), nullable=True)
    office_room = Column(String(50), nullable=True)
    phone_number = Column(String(20), nullable=True)
    status = Column(String(20), default="Active")

class Major(Base):
    __tablename__ = "majors"
    major_id = Column(String(20), primary_key=True)
    major_name = Column(String(150), unique=True, nullable=False)
    faculty_id = Column(String(20), ForeignKey("faculties.faculty_id"), nullable=False)
    degree_level = Column(String(50), default="Bachelors")

```


* **Tạo Pydantic Schema (Để khai báo API input/output):** Nhớ tạo các class như `FacultyCreate`, `FacultyResponse`, `MajorCreate`, `MajorResponse`.

---

### 2. Cập nhật các Model SQLAlchemy Đang Có (RẤT QUAN TRỌNG)

Bạn cần mở các file Model cũ ra, tìm và **XÓA** các cột cũ, thay bằng cột **ID Khóa ngoại** mới.

**a. Trong model `Lecturer` (Giảng viên):**

* ❌ Xóa: `department = Column(String(50))`
* ✅ Đổi thành: `faculty_id = Column(String(20), ForeignKey("faculties.faculty_id"))`

**b. Trong model `Subject` (Môn học):**

* ❌ Xóa: `department = Column(String(100))`
* ✅ Đổi thành: `faculty_id = Column(String(20), ForeignKey("faculties.faculty_id"))`
* *(Nhắc nhẹ: Nhớ cấu hình `credits = Column(Integer, FetchedValue())` như đã bàn lúc nãy để DB tự tính).*

**c. Trong model `AdministrativeClass` (Lớp hành chính):**

* ❌ Xóa: `faculty = Column(String(100))`
* ❌ Xóa: `major = Column(String(100))`
* ✅ Đổi thành: `faculty_id = Column(String(20), ForeignKey("faculties.faculty_id"))`
* ✅ Đổi thành: `major_id = Column(String(20), ForeignKey("majors.major_id"))`

**d. Trong model `Student` (Sinh viên):**

* ❌ Xóa: `department = Column(String(100))`
* ❌ Xóa: `major = Column(String(100))`
* ✅ Đổi thành: `faculty_id = Column(String(20), ForeignKey("faculties.faculty_id"))`
* ✅ Đổi thành: `major_id = Column(String(20), ForeignKey("majors.major_id"))`
* *(Đồng thời giữ nguyên việc đổi `administrative_class` thành `administrative_class_id` đã sửa lúc nãy).*

---

### 3. Cập nhật các Pydantic Schemas hiện tại

Tương tự như SQLAlchemy, nếu giao diện Frontend gửi request tạo mới sinh viên, môn học... thì các API Model (Pydantic) cũng phải khớp.

* Tìm tất cả các file schemas, search từ khóa `department`, `major`, `faculty` (kiểu chuỗi/str) và đổi tên chúng thành `faculty_id`, `major_id`.
* Ví dụ lúc trước người dùng gửi: `{"department": "Khoa CNTT 2"}` -> Giờ đổi thành yêu cầu gửi: `{"faculty_id": "FIT2"}`.

---

### 4. Thay đổi Dữ liệu File CSV và Luồng Import

Hệ thống DB của bạn giờ đã chặt chẽ hơn nhờ Khóa Ngoại. Do đó, bạn không thể nhắm mắt Import bừa bãi được nữa.

**a. Phải cập nhật lại nội dung file CSV:**
Ví dụ file Import Môn học (`subjects.csv`):

* ❌ Cũ: `BAS1201, Giải tích 1, 3, 0, Khoa Cơ bản 2, True`
* ✅ Mới: `BAS1201, Giải tích 1, 3, 0, FCB, True` *(Thay tên khoa bằng Mã Khoa, đồng thời đổi header cột từ `department` thành `faculty_id`)*.

**b. Thay đổi Thứ tự gọi API Import:**
Khóa ngoại yêu cầu "Bố mẹ phải có trước thì con mới được sinh ra". Nghĩa là nếu bạn import `Subject` trỏ đến `faculty_id = 'FCB'`, mà trong bảng `faculties` chưa có Khoa 'FCB' thì MySQL sẽ báo lỗi ngay.
**Thứ tự Import đúng từ nay về sau:**

1. Import File `Accounts` + `User Profiles`
2. Import File **`Faculties`** (Khoa)
3. Import File **`Majors`** (Ngành - trỏ về Khoa)
4. Import File **`Lecturers`** (Giảng viên - trỏ về Profile và Khoa)
5. Import File **`AdministrativeClasses`** (Lớp biên chế - trỏ về Khoa và Ngành)
6. Import File **`Students`** (Sinh viên - trỏ về Profile, Lớp biên chế, Khoa, Ngành)
7. Import File **`Subjects`** (Môn học - trỏ về Khoa)

