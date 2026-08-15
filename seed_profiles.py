"""Điền dữ liệu demo cho các trường hồ sơ đang NULL (SV/GV) để không còn N/A.

Chạy:  .venv/bin/python seed_profiles.py
Idempotent: chỉ điền vào ô NULL, không ghi đè dữ liệu đã có.
"""
import sys
import os
import random
from datetime import date

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "backend"))
from app.db.session import SessionLocal
from app.models import UserProfile, Student, Lecturer

random.seed(2026)

PROVINCES = [
    "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Huế",
    "Đắk Lắk", "Gia Lai", "Nghệ An", "Thanh Hóa", "Quảng Ninh", "Thái Nguyên",
    "Bắc Ninh", "Hải Dương", "Nam Định", "Lâm Đồng", "Khánh Hòa", "Tiền Giang",
]
STREETS = ["Trần Phú", "Lý Thường Kiệt", "Nguyễn Trãi", "Hai Bà Trưng", "Lê Lợi",
           "Trường Chinh", "Nguyễn Huệ", "Phạm Văn Đồng", "Hoàng Diệu", "Quang Trung"]
DISTRICTS = ["Trung tâm", "Q.1", "Q.2", "Hai Bà Trưng", "Thanh Xuân", "Cầu Giấy", "Ninh Kiều", "Hải Châu"]


def random_phone():
    return f"09{random.randint(10000000, 99999999)}"


def random_citizen():
    return "".join(str(random.randint(0, 9)) for _ in range(12))


def random_dob(cohort=""):
    year = 2002
    if cohort:
        # Kiểu "2022-2027" -> lấy năm bắt đầu + 18
        parts = str(cohort).split("-")
        digits = "".join(ch for ch in parts[0] if ch.isdigit()) if parts else ""
        if digits and len(digits) == 4:
            try:
                year = int(digits) + 18
            except Exception:
                year = 2002
    return date(year, random.randint(1, 12), random.randint(1, 28))


def random_address():
    return f"{random.randint(1, 199)} {random.choice(STREETS)}, {random.choice(DISTRICTS)}"


def main():
    db = SessionLocal()
    try:
        # Gán khoa/ngành (nếu chưa có)
        from app.models import Major, Faculty
        major = db.query(Major).first()
        faculty = db.query(Faculty).first()

        # --- Sinh viên ---
        students = db.query(Student).all()
        filled_sv = 0
        for st in students:
            p = st.profile
            if not p:
                continue
            if not st.major_id and major:
                st.major_id = major.major_id
            if not st.faculty_id and faculty:
                st.faculty_id = faculty.faculty_id
            changed = False
            if not p.date_of_birth:
                p.date_of_birth = random_dob(st.cohort)
                changed = True
            if not p.gender:
                p.gender = random.choice(["Nam", "Nữ"])
                changed = True
            if not p.citizen_id:
                p.citizen_id = random_citizen()
                changed = True
            if not p.ethnicity:
                p.ethnicity = "Kinh"
                changed = True
            if not p.religion:
                p.religion = "Không"
                changed = True
            if not p.nationality:
                p.nationality = "Việt Nam"
                changed = True
            if not p.phone_number:
                p.phone_number = random_phone()
                changed = True
            if not p.place_of_birth:
                p.place_of_birth = random.choice(PROVINCES)
                changed = True
            if not p.address:
                p.address = random_address()
                changed = True
            if changed:
                filled_sv += 1
        print(f"Sinh viên đã điền bổ sung: {filled_sv}/{len(students)}")

        # --- Giảng viên ---
        lecturers = db.query(Lecturer).all()
        filled_gv = 0
        for lec in lecturers:
            p = lec.profile
            if not p:
                continue
            changed = False
            if not p.date_of_birth:
                p.date_of_birth = date(random.randint(1975, 1985), random.randint(1, 12), random.randint(1, 28))
                changed = True
            if not p.gender:
                p.gender = random.choice(["Nam", "Nữ"])
                changed = True
            if not p.citizen_id:
                p.citizen_id = random_citizen()
                changed = True
            if not p.ethnicity:
                p.ethnicity = "Kinh"
                changed = True
            if not p.religion:
                p.religion = "Không"
                changed = True
            if not p.nationality:
                p.nationality = "Việt Nam"
                changed = True
            if not p.phone_number:
                p.phone_number = random_phone()
                changed = True
            if not p.place_of_birth:
                p.place_of_birth = random.choice(PROVINCES)
                changed = True
            if not p.address:
                p.address = random_address()
                changed = True
            if not lec.academic_title:
                lec.academic_title = random.choice(["TS.", "ThS.", "PGS.TS."])
                changed = True
            if not lec.faculty_id and faculty:
                lec.faculty_id = faculty.faculty_id
                changed = True
            if not lec.position:
                lec.position = random.choice(["Giảng viên", "Trưởng bộ môn", "Phó khoa"])
                changed = True
            if not lec.employment_type:
                lec.employment_type = random.choice(["Hợp đồng dài hạn", "Hợp đồng 1 năm"])
                changed = True
            if not lec.hire_date:
                lec.hire_date = date(random.randint(2005, 2018), random.randint(1, 12), random.randint(1, 28))
                changed = True
            if changed:
                filled_gv += 1
        print(f"Giảng viên đã điền bổ sung: {filled_gv}/{len(lecturers)}")

        db.commit()
        print("\nHOÀN TẤT: Các trường hồ sơ trống đã được điền dữ liệu demo.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
