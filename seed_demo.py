"""
SEED DATA DEMO — Chuẩn bị sẵn dữ liệu để demo hệ thống với thầy cô.

Cách chạy (từ thư mục gốc dự án, sau khi đã chạy MySQL + backend):
    .venv/bin/python seed_demo.py

Script an toàn (idempotent): nếu dữ liệu đã tồn tại sẽ bỏ qua, không ghi đè.
Cuối script sẽ in ra "LUỒNG CHẠY DEMO" để bạn lần lượt trình diễn.
"""
import os
import sys
import hashlib

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, "backend"))

from app.db.session import SessionLocal  # noqa: E402
from app.models.account import Account  # noqa: E402
from app.models.student import Student  # noqa: E402
from app.models.user_profile import UserProfile  # noqa: E402
from app.models.lecturer import Lecturer  # noqa: E402
from app.models.subject import Subject  # noqa: E402
from app.models.credit_class import CreditClass  # noqa: E402
from app.models.student_class import StudentClassEnrollment  # noqa: E402
from app.models.class_schedule import ClassSchedule  # noqa: E402
from datetime import datetime, time, timedelta  # noqa: E402


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def ensure_account(db, username, password, role):
    acc = db.query(Account).filter(Account.username == username.lower()).first()
    if acc:
        return acc
    acc = Account(username=username.lower(), password_hash=hash_password(password), role=role)
    db.add(acc)
    db.flush()
    return acc


def ensure_lecturer(db, lecturer_id, full_name, email, department):
    lec = db.query(Lecturer).filter(Lecturer.lecturer_id == lecturer_id).first()
    if not lec:
        lec = Lecturer(
            lecturer_id=lecturer_id,
            department=department,
            teaching_status="Active",
        )
        db.add(lec)
        db.flush()
    # Đảm bảo giảng viên có UserProfile (full_name/email nay đọc từ profile)
    if lec.profile_id is None:
        profile = UserProfile(full_name=full_name, personal_email=email, phone_number="0900.000.001")
        db.add(profile)
        db.flush()
        lec.profile_id = profile.profile_id
        db.flush()
    return lec


def ensure_subject(db, subject_id, name, credits, semester, prereq=None):
    sub = db.query(Subject).filter(Subject.subject_id == subject_id).first()
    if not sub:
        sub = Subject(
            subject_id=subject_id, subject_name=name, credits=credits,
            theory_credits=credits, practical_credits=0,
            theory_periods=credits * 15, practical_periods=0, total_periods=credits * 15,
            semester=semester, prerequisites=prereq or None,
        )
        db.add(sub)
        db.flush()
    return sub


def ensure_class(db, class_id, subject_id, lecturer_id, semester, year, max_sv, cohort):
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id).first()
    if not cc:
        cc = CreditClass(
            class_id=class_id, subject_id=subject_id, lecturer_id=lecturer_id,
            semester=semester, academic_year=year, cohort=cohort,
            max_students=max_sv, current_students=0, status="Active",
        )
        db.add(cc)
        db.flush()
    return cc


def ensure_student(db, mssv, full_name, administrative_class, cohort, major):
    st = db.query(Student).filter(Student.student_id == mssv).first()
    if st:
        return st
    profile = UserProfile(full_name=full_name, personal_email=f"{mssv.lower()}@ptit.edu.vn")
    db.add(profile)
    db.flush()
    st = Student(
        student_id=mssv, profile_id=profile.profile_id,
        administrative_class_id=administrative_class,
        specialization="Công nghệ phần mềm",
        cohort=cohort,
        training_program="Đại học chính quy", academic_status="Đang học",
    )
    db.add(st)
    db.flush()
    # Liên kết tài khoản (đã tạo ở bước 1) với hồ sơ sinh viên
    acc = db.query(Account).filter(Account.username == mssv.lower()).first()
    if acc:
        profile.account_id = acc.account_id
        db.flush()
    return st


def ensure_enroll(db, class_id, student_id):
    exists = db.query(StudentClassEnrollment).filter(
        StudentClassEnrollment.class_id == class_id,
        StudentClassEnrollment.student_id == student_id,
    ).first()
    if exists:
        return
    db.add(StudentClassEnrollment(class_id=class_id, student_id=student_id, academic_status="Active"))
    db.flush()


def ensure_schedule(db, class_id, study_date, room, hour, minute):
    exists = db.query(ClassSchedule).filter(
        ClassSchedule.class_id == class_id,
        ClassSchedule.study_date == study_date,
        ClassSchedule.room == room,
        ClassSchedule.start_time == time(hour, minute),
    ).first()
    if not exists:
        db.add(ClassSchedule(class_id=class_id, study_date=study_date, room=room, start_time=time(hour, minute)))
        db.flush()


def main():
    db = SessionLocal()
    try:
        print("=== 1. Tài khoản demo ===")
        ensure_account(db, "admin", "123456", "admin")
        gv_account = ensure_account(db, "giangvien", "123456", "giang_vien")
        for mssv in ["N22DCCN160", "N22DCCN161", "N22DCCN162"]:
            ensure_account(db, mssv, "123456", "sinh_vien")
        print("  admin / 123456 | giangvien / 123456 | N22DCCN160 / 123456")
        db.commit()

        print("=== 2. Giảng viên ===")
        gv = ensure_lecturer(db, "GV001", "Nguyễn Văn Hùng", "hungnv@ptit.edu.vn", "Bộ môn CNTT")
        gv2 = ensure_lecturer(db, "GV002", "Trần Thị Mai", "maitt@ptit.edu.vn", "Bộ môn Hệ thống thông tin")
        # Liên kết tài khoản giangvien -> hồ sơ GV001 (qua UserProfile)
        if gv.profile and gv.profile.account_id is None:
            gv.profile.account_id = gv_account.account_id
        db.commit()

        print("=== 3. Môn học (kèm tiên quyết) ===")
        INT1152 = ensure_subject(db, "INT1152", "Nhập môn lập trình (C)", 3, 1)
        INT1306 = ensure_subject(db, "INT1306", "Lập trình C nâng cao", 4, 1, prereq="INT1152")
        INT1310 = ensure_subject(db, "INT1310", "Lập trình hướng đối tượng", 3, 2, prereq="INT1152")
        INT3013 = ensure_subject(db, "INT3013", "Cấu trúc dữ liệu & giải thuật", 3, 2, prereq="INT1306")
        db.commit()

        print("=== 4. Lớp tín chỉ (kỳ, sĩ số, khóa) ===")
        cls_base = ensure_class(db, "D22CQCNPM02-N", INT1152.subject_id, gv.lecturer_id, 1, "2025-2026", 45, "D22")
        cls_adv = ensure_class(db, "D22CQCNPM01-N", INT1306.subject_id, gv.lecturer_id, 1, "2025-2026", 40, "D22")
        cls_oop = ensure_class(db, "D22CQCNTT03-N", INT1310.subject_id, gv2.lecturer_id, 2, "2025-2026", 40, "D22")
        cls_future = ensure_class(db, "D21CQCNPM09-N", INT3013.subject_id, gv2.lecturer_id, 2, "2024-2025", 30, "D21")
        db.commit()

        print("=== 5. Sinh viên + tài khoản + đăng ký ===")
        sv1 = ensure_student(db, "N22DCCN160", "Nguyễn Lê Nhất Huy", "D22CQCNPM01", "D22", "Công nghệ thông tin")
        sv2 = ensure_student(db, "N22DCCN161", "Lê Thị Thảo", "D22CQCNPM01", "D22", "Công nghệ thông tin")
        sv3 = ensure_student(db, "N22DCCN162", "Trần Văn Minh", "D22CQCNPM01", "D22", "Công nghệ thông tin")
        # SV1 đã học môn nền -> có thể đăng ký C++ tạo minh họa tiên quyết
        ensure_enroll(db, cls_base.class_id, sv1.student_id)
        # SV2 chưa có INT1152 -> demo chặn bởi tiên quyết
        ensure_enroll(db, cls_oop.class_id, sv1.student_id)
        db.commit()

        print("=== 6. Lịch học (hôm nay + 3 ngày tới) ===")
        today = datetime.now().date()
        hour_now = datetime.now().hour
        for offset in range(4):
            day = today + timedelta(days=offset)
            if offset == 0:
                ensure_schedule(db, cls_base.class_id, day, "A2-301", hour_now, 0)
            else:
                ensure_schedule(db, cls_base.class_id, day, "A2-301", 7, 30)
            ensure_schedule(db, cls_adv.class_id, day, "B1-402", 13, 30)
            ensure_schedule(db, cls_oop.class_id, day, "B2-305", 9, 0)
        db.commit()

        print("=== 7. Đồng bộ sĩ số ===")
        for cc in (cls_base, cls_adv, cls_oop, cls_future):
            cc.current_students = db.query(StudentClassEnrollment).filter(
                StudentClassEnrollment.class_id == cc.class_id
            ).count()
        db.commit()

        print()
        print("=" * 62)
        print(" ĐÃ SẴN SÀNG DỮ LIỆU DEMO.")
        print("=" * 62)
        print()
        print(">>> LUỒNG CHẠY DEMO (trình diễn với thầy cô):")
        print("  1. Mở frontend http://localhost:5173 và đăng nhập ADMIN (admin / 123456).")
        print("  2. Tab 'Bảng điều khiển Demo': bật/tắt từng quy tắc để trình diễn 'nới' & 'chặt'.")
        print("  3. Đăng nhập giảng viên giangvien/123456 -> Quản lý lớp, điểm danh nhanh, xin nghỉ phép.")
        print("  4. Đăng nhập sinh viên N22DCCN160/123456 -> xem 'Lớp học của tôi', 'Đăng ký học phần',")
        print("     'Xin nghỉ phép', 'Sinh trắc học Face ID'.")
        print("  5. Demo quy tắc đăng ký: N22DCCN160 có INT1152 → đăng ký được INT1306;")
        print("     N22DCCN161 chưa có INT1152 → bị chặn 'tiên quyết'. Lớp D21CQCNPM09-T bị chặn theo khóa/kỳ.")
        print("  6. Điểm danh AI: tab 'Điểm danh Camera' (admin) hoặc tab sv dùng webcam? Room mặc định A2-301.")
        print("     Nếu ngoài khung giờ, dùng 'Điểm danh nhanh' (giảng viên) để minh họa.")
        print("  7. Báo cáo tổng kết/cấm thi: tab 'Tổng kết & Cấm thi' (giảng viên) -> xuất file Excel.")
        print()
        print("  TÀI KHOẢN: admin/123456 · giangvien/123456 · N22DCCN160/123456 · N22DCCN161/123456")
    except Exception as e:
        db.rollback()
        print(f"LỖI khi seed dữ liệu: {e}")
        raise
    finally:
        db.close()


def needs_seed():
    """Kiểm tra DB đã có tài khoản chưa (dùng cho Docker entrypoint)."""
    try:
        from app.models.account import Account
        db = SessionLocal()
        try:
            return db.query(Account).first() is None
        finally:
            db.close()
    except Exception:
        return True


if __name__ == "__main__":
    main()