import re
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import date

_CCCD_RE = re.compile(r"^\d{9}$|^\d{12}$")            # CMND 9 số / CCCD 12 số
_PHONE_RE = re.compile(r"^(0|\+84|84)[3-9]\d{8,9}$")  # SĐT Việt Nam
_GENDERS = {"Nam", "Nữ", "Khác", ""}


def _empty_to_none(v):
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


class StudentBase(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None  # Sẽ map vào personal_email của user_profiles
    phone_number: Optional[str] = None

    administrative_class: Optional[str] = None
    major_id: Optional[str] = None
    specialization: Optional[str] = None  # Mới thêm
    faculty_id: Optional[str] = None     # Mới thêm
    cohort: Optional[str] = None
    training_program: Optional[str] = None
    academic_status: Optional[str] = "Đang học"

    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    citizen_id: Optional[str] = None
    ethnicity: Optional[str] = None
    religion: Optional[str] = None
    nationality: Optional[str] = "Việt Nam"
    place_of_birth: Optional[str] = None
    address: Optional[str] = None
    # Lưu ý: validators chỉ đặt ở StudentCreate/StudentUpdate (input),
    # KHÔNG đặt ở StudentBase để StudentResponse không re-validate dữ liệu cũ.


class StudentCreate(StudentBase):
    student_id: str

    @field_validator("student_id", mode="before")
    @classmethod
    def validate_student_id(cls, v):
        v = _empty_to_none(v)
        if v is None:
            raise ValueError("Mã sinh viên không được để trống.")
        return str(v).strip().upper()

    @field_validator("citizen_id", mode="before")
    @classmethod
    def validate_citizen_id(cls, v):
        v = _empty_to_none(v)
        if v is None:
            return None
        if not _CCCD_RE.fullmatch(v):
            raise ValueError("CCCD/CMND phải gồm 9 chữ số (CMND) hoặc 12 chữ số (CCCD).")
        return v

    @field_validator("phone_number", mode="before")
    @classmethod
    def validate_phone(cls, v):
        v = _empty_to_none(v)
        if v is None:
            return None
        v = str(v).replace(" ", "").replace("-", "")
        if not _PHONE_RE.fullmatch(v):
            raise ValueError("Số điện thoại không hợp lệ (VD: 0912345678, +84912345678).")
        return v

    @field_validator("email", mode="before")
    @classmethod
    def validate_email(cls, v):
        v = _empty_to_none(v)
        if v is None:
            return None
        return str(v).strip().lower()

    @field_validator("date_of_birth", mode="before")
    @classmethod
    def validate_dob(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            try:
                v = date.fromisoformat(v)
            except ValueError:
                raise ValueError("Ngày sinh không đúng định dạng (YYYY-MM-DD).")
        if v > date.today():
            raise ValueError("Ngày sinh không được ở tương lai.")
        return v

    @field_validator("gender", mode="before")
    @classmethod
    def validate_gender(cls, v):
        v = _empty_to_none(v)
        if v is None:
            return None
        if v not in _GENDERS:
            raise ValueError("Giới tính phải là: Nam, Nữ hoặc Khác.")
        return v


class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    administrative_class: Optional[str] = None
    specialization: Optional[str] = None
    academic_status: Optional[str] = None
    address: Optional[str] = None
    citizen_id: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None

    @field_validator("citizen_id", mode="before")
    @classmethod
    def validate_citizen_id(cls, v):
        v = _empty_to_none(v)
        if v is None:
            return None
        if not _CCCD_RE.fullmatch(v):
            raise ValueError("CCCD/CMND phải gồm 9 chữ số (CMND) hoặc 12 chữ số (CCCD).")
        return v

    @field_validator("phone_number", mode="before")
    @classmethod
    def validate_phone(cls, v):
        v = _empty_to_none(v)
        if v is None:
            return None
        v = str(v).replace(" ", "").replace("-", "")
        if not _PHONE_RE.fullmatch(v):
            raise ValueError("Số điện thoại không hợp lệ (VD: 0912345678, +84912345678).")
        return v

    @field_validator("email", mode="before")
    @classmethod
    def validate_email(cls, v):
        v = _empty_to_none(v)
        if v is None:
            return None
        return str(v).strip().lower()

    @field_validator("date_of_birth", mode="before")
    @classmethod
    def validate_dob(cls, v):
        if v is None or v == "":
            return None
        if isinstance(v, str):
            try:
                v = date.fromisoformat(v)
            except ValueError:
                raise ValueError("Ngày sinh không đúng định dạng (YYYY-MM-DD).")
        if v > date.today():
            raise ValueError("Ngày sinh không được ở tương lai.")
        return v

    @field_validator("gender", mode="before")
    @classmethod
    def validate_gender(cls, v):
        v = _empty_to_none(v)
        if v is None:
            return None
        if v not in _GENDERS:
            raise ValueError("Giới tính phải là: Nam, Nữ hoặc Khác.")
        return v


class StudentResponse(StudentBase):
    student_id: str
    profile_id: Optional[int] = None
    major: Optional[str] = None
    department: Optional[str] = None

    class Config:
        from_attributes = True


class PaginatedStudentResponse(BaseModel):
    total: int
    items: list[StudentResponse]
