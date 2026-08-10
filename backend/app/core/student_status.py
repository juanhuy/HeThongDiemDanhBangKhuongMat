"""Chuẩn hoá trạng thái học tập của sinh viên (students.academic_status).

Bộ trạng thái chuẩn (tiếng Việt) — toàn hệ thống dùng duy nhất các giá trị này:
    - Đang học   (đang theo học, còn hiệu lực)
    - Bảo lưu    (bảo lưu kết quả, tạm ngừng theo học)
    - Tốt nghiệp (đã hoàn thành chương trình)
    - Thôi học   (đã thôi học)
    - Đình chỉ   (bị đình chỉ học tập)

Hàm normalize_academic_status() tự chuyển các giá trị cũ/tiếng Anh
("studying", "active", "graduated", "dropped_out", ...) về giá trị chuẩn,
giúp dữ liệu legacy và mọi nơi kiểm tra nhất quán.
"""
ACADEMIC_STATUS_ACTIVE = "Đang học"
ACADEMIC_STATUS_ON_LEAVE = "Bảo lưu"
ACADEMIC_STATUS_GRADUATED = "Tốt nghiệp"
ACADEMIC_STATUS_DROPPED = "Thôi học"
ACADEMIC_STATUS_SUSPENDED = "Đình chỉ"

# Các trạng thái hợp lệ (để validate đầu vào)
VALID_ACADEMIC_STATUSES = (
    ACADEMIC_STATUS_ACTIVE,
    ACADEMIC_STATUS_ON_LEAVE,
    ACADEMIC_STATUS_GRADUATED,
    ACADEMIC_STATUS_DROPPED,
    ACADEMIC_STATUS_SUSPENDED,
)

# Trạng thái khoá tài khoản đăng nhập
ACCOUNT_LOCKED_STATUSES = (ACADEMIC_STATUS_GRADUATED, ACADEMIC_STATUS_DROPPED, ACADEMIC_STATUS_SUSPENDED)

# Ánh xạ giá trị cũ/tiếng Anh -> giá trị chuẩn
_LEGACY_MAP = {
    "studying": ACADEMIC_STATUS_ACTIVE,
    "active": ACADEMIC_STATUS_ACTIVE,
    "dang hoc": ACADEMIC_STATUS_ACTIVE,
    "đang học": ACADEMIC_STATUS_ACTIVE,
    "on_leave": ACADEMIC_STATUS_ON_LEAVE,
    "baoluu": ACADEMIC_STATUS_ON_LEAVE,
    "bảo lưu": ACADEMIC_STATUS_ON_LEAVE,
    "graduated": ACADEMIC_STATUS_GRADUATED,
    "tot nghiep": ACADEMIC_STATUS_GRADUATED,
    "tốt nghiệp": ACADEMIC_STATUS_GRADUATED,
    "dropped_out": ACADEMIC_STATUS_DROPPED,
    "dropped out": ACADEMIC_STATUS_DROPPED,
    "thoi hoc": ACADEMIC_STATUS_DROPPED,
    "thôi học": ACADEMIC_STATUS_DROPPED,
    "suspended": ACADEMIC_STATUS_SUSPENDED,
    "dinh chi": ACADEMIC_STATUS_SUSPENDED,
    "đình chỉ": ACADEMIC_STATUS_SUSPENDED,
}


def normalize_academic_status(value):
    """Chuẩn hoá một giá trị trạng thái về bộ chuẩn tiếng Việt.

    Trả về giá trị chuẩn nếu nhận diện được; ngược lại trả về giá trị
    gốc (đã strip) để không làm mất dữ liệu lạ; None nếu không có giá trị.
    """
    if value is None:
        return None
    v = str(value).strip()
    if not v:
        return None
    return _LEGACY_MAP.get(v.lower(), v)


def is_active_student(value):
    """True nếu sinh viên đang theo học (đủ điều kiện tham gia)."""
    return normalize_academic_status(value) == ACADEMIC_STATUS_ACTIVE
