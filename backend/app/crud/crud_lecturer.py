from datetime import date
from sqlalchemy.orm import joinedload
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models import Account, Lecturer, UserProfile
from app.schemas.lecturer import LecturerCreate, LecturerUpdate

from sqlalchemy.orm import contains_eager


def build_lecturer_id(sequence: int, year: int | None = None) -> str:
    current_year = year or date.today().year
    return f"GV{current_year}{sequence:03d}"


def _next_lecturer_sequence(db: Session, year: int | None = None) -> int:
    current_year = year or date.today().year
    prefix = f"GV{current_year}"
    rows = db.query(Lecturer.lecturer_id).filter(Lecturer.lecturer_id.like(f"{prefix}%")).all()
    numbers = []
    for (lecturer_id,) in rows:
        if not lecturer_id or not lecturer_id.startswith(prefix):
            continue
        try:
            numbers.append(int(lecturer_id.replace(prefix, "")))
        except ValueError:
            continue
    return max(numbers) + 1 if numbers else 1


def get_lecturer(db: Session, lecturer_id: str):
    from sqlalchemy import func
    return (
        db.query(Lecturer)
        .options(joinedload(Lecturer.faculty))
        .options(joinedload(Lecturer.profile))
        .filter(func.lower(Lecturer.lecturer_id) == lecturer_id.strip().lower())
        .first()
    )


def get_lecturers(db: Session, skip: int = 0, limit: int = 100, search: str = None):
    query = (
        db.query(Lecturer)
        .options(joinedload(Lecturer.faculty)) # Bảng Faculty không filter gì thì dùng joinedload
        .join(Lecturer.profile) # 1. Join thông qua relationship (Inner Join)
        .options(contains_eager(Lecturer.profile)) # 2. Báo SQLAlchemy: "Hãy dùng cái join ở trên để map dữ liệu luôn, đừng query thêm"
    )
    
    if search:
        query = query.filter(or_(
            UserProfile.full_name.ilike(f"%{search}%"),
            Lecturer.lecturer_id.ilike(f"%{search}%")
        ))
    
    return query.offset(skip).limit(limit).all()


def create_lecturer(db: Session, lecturer: LecturerCreate):
    lecturer_id = (lecturer.lecturer_id or "").strip()
    if not lecturer_id:
        lecturer_id = build_lecturer_id(_next_lecturer_sequence(db))

    default_password_hash = get_password_hash("123456")
    username = lecturer_id.strip().lower()
    existing_account = db.query(Account).filter(Account.username == username).first()
    if existing_account:
        account = existing_account
    else:
        account = Account(
            username=username,
            password_hash=default_password_hash,
            role="giang_vien",
            is_active=True
        )
        db.add(account)
        db.flush()

    profile = UserProfile(
        account_id=account.account_id,
        full_name=lecturer.full_name,
        personal_email=lecturer.email,
        phone_number=lecturer.phone_number,
        date_of_birth=lecturer.date_of_birth,
        gender=lecturer.gender,
        citizen_id=lecturer.citizen_id,
        ethnicity=lecturer.ethnicity,
        religion=lecturer.religion,
        nationality=lecturer.nationality,
        address=lecturer.address,
        place_of_birth=lecturer.place_of_birth
    )
    db.add(profile)
    db.flush()

    db_lecturer = Lecturer(
        lecturer_id=lecturer_id,
        profile_id=profile.profile_id,
        faculty_id=lecturer.faculty_id,
        academic_title=lecturer.academic_title,
        position=lecturer.position or "Giảng viên",
        employment_type=lecturer.employment_type,
        teaching_status=lecturer.teaching_status or "Active"
    )
    db.add(db_lecturer)
    db.commit()
    db.refresh(db_lecturer)
    return db_lecturer


def update_lecturer(db: Session, db_lecturer: Lecturer, lecturer_update: LecturerUpdate):
    update_data = lecturer_update.model_dump(exclude_unset=True)

    # 1. Định nghĩa map các trường thuộc về UserProfile (Bên trái là key schema, bên phải là tên cột DB)
    profile_fields_map = {
        "full_name": "full_name",
        "email": "personal_email", # Lưu ý trường hợp tên khác nhau này
        "phone_number": "phone_number",
        "date_of_birth": "date_of_birth",
        "gender": "gender",
        "citizen_id": "citizen_id",
        "ethnicity": "ethnicity",
        "religion": "religion",
        "nationality": "nationality",
        "address": "address",
        "place_of_birth": "place_of_birth"
    }

    for key, value in update_data.items():
        # Xử lý cập nhật thông tin Profile
        if key in profile_fields_map:
            db_col_name = profile_fields_map[key]
            setattr(db_lecturer.profile, db_col_name, value)
            
        # Xử lý cập nhật trạng thái làm việc (Và khóa tài khoản theo)
        elif key == "teaching_status":
            db_lecturer.teaching_status = value
            if db_lecturer.profile.account:
                if value in ["Retired", "Resigned"]:
                    db_lecturer.profile.account.is_active = False
                elif value == "Active":
                    db_lecturer.profile.account.is_active = True
                    
        # Xử lý cờ kích hoạt Account độc lập
        elif key == "is_active":
            if db_lecturer.profile.account:
                db_lecturer.profile.account.is_active = value
                
        # Các trường còn lại thuộc về chính bảng Lecturer (faculty_id, academic_title, position...)
        else:
            setattr(db_lecturer, key, value)

    db.commit()
    db.refresh(db_lecturer)
    return db_lecturer

def delete_lecturer(db: Session, lecturer_id: str):
    db_lecturer = get_lecturer(db, lecturer_id)
    if not db_lecturer:
        return None
    # Khóa tài khoản liên kết (qua profile.account) thay vì xóa cứng
    if getattr(db_lecturer, 'profile', None) and getattr(db_lecturer.profile, 'account', None):
        db_lecturer.profile.account.is_active = False
        db.add(db_lecturer.profile.account)
    db.delete(db_lecturer)
    db.commit()
    return db_lecturer


def generate_lecturer_id(db: Session) -> str:
    return build_lecturer_id(_next_lecturer_sequence(db))
