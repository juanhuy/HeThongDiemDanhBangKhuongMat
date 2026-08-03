from datetime import date

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models import Account, Lecturer, UserProfile
from app.schemas.lecturer import LecturerCreate, LecturerUpdate


def build_lecturer_id(sequence: int, year: int | None = None) -> str:
    current_year = year or date.today().year
    return f"GV{current_year}{sequence:03d}"


def _next_lecturer_sequence(db: Session, year: int | None = None) -> int:
    current_year = year or date.today().year
    prefix = f"GV{current_year}"
    rows = db.query(Lecturer.lecturer_id).filter(Lecturer.lecturer_id.like(f"{prefix}%")) .all()
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
    return db.query(Lecturer).filter(Lecturer.lecturer_id == lecturer_id).first()


def get_lecturers(db: Session, skip: int = 0, limit: int = 100, search: str = None):
    query = db.query(Lecturer)
    if search:
        query = query.join(UserProfile).filter(or_(
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
        department=lecturer.department,
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

    for key, value in update_data.items():
        if key in ["full_name", "email", "phone_number", "date_of_birth", "gender", "citizen_id", "ethnicity", "religion", "nationality", "address", "place_of_birth"]:
            if key == "full_name":
                db_lecturer.profile.full_name = value
            elif key == "email":
                db_lecturer.profile.personal_email = value
            elif key == "phone_number":
                db_lecturer.profile.phone_number = value
            elif key == "date_of_birth":
                db_lecturer.profile.date_of_birth = value
            elif key == "gender":
                db_lecturer.profile.gender = value
            elif key == "citizen_id":
                db_lecturer.profile.citizen_id = value
            elif key == "ethnicity":
                db_lecturer.profile.ethnicity = value
            elif key == "religion":
                db_lecturer.profile.religion = value
            elif key == "nationality":
                db_lecturer.profile.nationality = value
            elif key == "address":
                db_lecturer.profile.address = value
            elif key == "place_of_birth":
                db_lecturer.profile.place_of_birth = value
        elif key == "teaching_status":
            db_lecturer.teaching_status = value
            if value in ["Retired", "Resigned"] and db_lecturer.profile.account:
                db_lecturer.profile.account.is_active = False
            elif value == "Active" and db_lecturer.profile.account:
                db_lecturer.profile.account.is_active = True
        elif key not in ["is_active"]:
            setattr(db_lecturer, key, value)

    if "is_active" in update_data and db_lecturer.profile.account:
        db_lecturer.profile.account.is_active = update_data["is_active"]

    db.commit()
    db.refresh(db_lecturer)
    return db_lecturer