"""Seed dữ liệu TEST cho tính năng Điểm danh thủ công (Manual Check-in).

Tạo:
- Giảng viên `GV001` (tài khoản demo `giangvien` map vào GV001 để phân quyền hoạt động).
- 10 sinh viên: N25DCCN501 ... N25DCCN510 (mật khẩu 123456).
- Lớp tín chỉ TESTD01-N (môn INT1152) do `GV001` dạy.
- 3 buổi học (class_sessions) + một số bản ghi điểm danh mẫu (AI + thủ công).

Chạy:  .venv/bin/python seed_manual_checkin.py
Idempotent: chạy lại nhiều lần không lỗi.
"""
import sys
import os
from datetime import datetime, timedelta, date

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "backend"))
from app.db.session import SessionLocal
from app.models import (
    Account, UserProfile, Student, Lecturer, CreditClass,
    StudentClassEnrollment, ClassEnrollment, ClassSession, AttendanceRecord,
    ClassSchedule,
)

MSSVS = [f"N25DCCN5{str(i).zfill(2)}" for i in range(1, 11)]
NAMES = [
    "Nguyễn Văn An", "Trần Thị Bích", "Lê Hoàng Cường", "Phạm Minh Dũng", "Hoàng Thị Em",
    "Đỗ Văn Phúc", "Bùi Thị Giang", "Vũ Đức Hải", "Ngô Thị Hạnh", "Đặng Văn Hiếu",
]
CLASS_ID = "TESTD01-N"
SUBJECT_ID = "INT1152"
LECTURER_ID = "GV001"
ADMIN_CLASS = "D25CNPM01"
ROOM_ID = "TEST-301"
SEMESTER_ID = "2025-2026-1"


def main():
    db = SessionLocal()
    try:
        # 1) Giảng viên giangvien (khớp tài khoản demo)
        lec = db.query(Lecturer).filter(Lecturer.lecturer_id == LECTURER_ID).first()
        if not lec:
            acc = db.query(Account).filter(Account.username == "giangvien").first()
            profile = acc.profile if acc and hasattr(acc, "profile") else None
            if profile is None:
                profile = db.query(UserProfile).filter(
                    UserProfile.account_id == acc.account_id).first() if acc else None
            if profile is None:
                print("Không tìm thấy profile của tài khoản giangvien — cần seed tài khoản trước.")
                return
            lec = Lecturer(lecturer_id=LECTURER_ID, profile_id=profile.profile_id,
                           academic_title="ThS.", teaching_status="Active")
            db.add(lec)
            db.commit()
            print(f"Tạo giảng viên {LECTURER_ID} (profile {profile.profile_id})")

        # 2) Sinh viên
        for i, (mssv, name) in enumerate(zip(MSSVS, NAMES)):
            st = db.query(Student).filter(Student.student_id == mssv).first()
            if not st:
                username = mssv.lower()
                acc = db.query(Account).filter(Account.username == username).first()
                if not acc:
                    import bcrypt
                    acc = Account(username=username,
                                  password_hash=bcrypt.hashpw(b"123456", bcrypt.gensalt()).decode(),
                                  role="sinh_vien", is_active=True)
                    db.add(acc)
                    db.flush()
                prof = db.query(UserProfile).filter(UserProfile.account_id == acc.account_id).first()
                if not prof:
                    prof = UserProfile(account_id=acc.account_id, full_name=name,
                                       personal_email=f"{mssv}@student.ptit.edu.vn")
                    db.add(prof)
                    db.flush()
                st = Student(student_id=mssv, profile_id=prof.profile_id,
                             administrative_class_id=ADMIN_CLASS, cohort="D25",
                             academic_status="Đang học")
                db.add(st)
                db.commit()
        print(f"Đảm bảo {len(MSSVS)} sinh viên.")

        # 3) Lớp tín chỉ
        cc = db.query(CreditClass).filter(CreditClass.class_id == CLASS_ID).first()
        if not cc:
            cc = CreditClass(class_id=CLASS_ID, subject_id=SUBJECT_ID, lecturer_id=LECTURER_ID,
                             semester_id=SEMESTER_ID, semester=1, academic_year="2025-2026",
                             cohort="D25", max_students=50, current_students=len(MSSVS),
                             group_number=1, class_type="Combined", status="Active")
            db.add(cc)
            db.commit()
            print(f"Tạo lớp {CLASS_ID}")
        else:
            cc.current_students = len(MSSVS)
            db.commit()

        # 4) Đăng ký 10 SV
        for mssv in MSSVS:
            if not db.query(StudentClassEnrollment).filter(
                    StudentClassEnrollment.class_id == CLASS_ID,
                    StudentClassEnrollment.student_id == mssv).first():
                db.add(StudentClassEnrollment(class_id=CLASS_ID, student_id=mssv, academic_status="Active"))
            if not db.query(ClassEnrollment).filter(
                    ClassEnrollment.class_id == CLASS_ID,
                    ClassEnrollment.student_id == mssv).first():
                db.add(ClassEnrollment(class_id=CLASS_ID, student_id=mssv))
        db.commit()
        print("Đã đăng ký 10 SV vào lớp.")

        # 5) Buổi học (3 buổi gần đây)
        now = datetime.now()
        session_days = [now.date() - timedelta(days=2), now.date() - timedelta(days=1), now.date()]
        for idx, day in enumerate(session_days):
            exists = db.query(ClassSession).filter(
                ClassSession.class_id == CLASS_ID, ClassSession.session_date == day).first()
            if exists:
                continue
            start = datetime.combine(day, datetime.min.time().replace(hour=7 + idx * 3, minute=0))
            end = start + timedelta(hours=3)
            db.add(ClassSession(
                class_id=CLASS_ID, room_id=ROOM_ID, session_date=day,
                shift=1 + idx, start_time=start, end_time=end,
                session_type="Theory", status="Scheduled"))
        db.commit()

        sessions = db.query(ClassSession).filter(ClassSession.class_id == CLASS_ID) \
            .order_by(ClassSession.session_date).all()
        print(f"Đảm bảo {len(sessions)} buổi học.")

        # 5b) Lịch (class_schedules) cho nghiệp vụ XIN NGHỈ PHÉP
        #     2 buổi sắp tới (được xin phép) + 1 buổi đã qua (không được xin)
        today = date.today()
        sched_days = [
            (today - timedelta(days=3), True),   # đã qua -> started
            (today + timedelta(days=1), False),  # sắp tới -> eligible
            (today + timedelta(days=2), False),  # sắp tới -> eligible
        ]
        for day, _ in sched_days:
            exists = db.query(ClassSchedule).filter(
                ClassSchedule.class_id == CLASS_ID, ClassSchedule.study_date == day).first()
            if exists:
                continue
            db.add(ClassSchedule(class_id=CLASS_ID, study_date=day,
                                 room=ROOM_ID, start_time=datetime.min.time().replace(hour=7, minute=30)))
        db.commit()
        n_sched = db.query(ClassSchedule).filter(ClassSchedule.class_id == CLASS_ID).count()
        print(f"Đảm bảo {n_sched} lịch học (class_schedules) cho xin nghỉ phép.")

        # 6) Bản ghi điểm danh mẫu (AI + thủ công)
        if sessions:
            s0, s1 = sessions[0], sessions[1]
            # Buổi 1: 3 SV có mặt (AI), 1 SV vắng (AI)
            for mssv in [MSSVS[0], MSSVS[1], MSSVS[2]]:
                if not db.query(AttendanceRecord).filter(
                        AttendanceRecord.student_id == mssv,
                        AttendanceRecord.session_id == s0.session_id).first():
                    db.add(AttendanceRecord(student_id=mssv, session_id=s0.session_id,
                                            status="Đúng giờ", recorded_at=s0.start_time,
                                            confidence_score=0.95, source="AI"))
            if not db.query(AttendanceRecord).filter(
                    AttendanceRecord.student_id == MSSVS[3],
                    AttendanceRecord.session_id == s0.session_id).first():
                db.add(AttendanceRecord(student_id=MSSVS[3], session_id=s0.session_id,
                                        status="Vắng", recorded_at=s0.start_time,
                                        confidence_score=0.88, source="AI"))
            # Buổi 2: 1 SV đi muộn (thủ công) để test phân loại nguồn
            if not db.query(AttendanceRecord).filter(
                    AttendanceRecord.student_id == MSSVS[0],
                    AttendanceRecord.session_id == s1.session_id).first():
                db.add(AttendanceRecord(student_id=MSSVS[0], session_id=s1.session_id,
                                        status="Late", recorded_at=s1.start_time,
                                        notes="ĐD bởi GV test", source="manual"))
        db.commit()
        print("Đã ghi bản ghi điểm danh mẫu.")

        print("\n=== HOÀN TẤT ===")
        print(f"Lớp: {CLASS_ID} | GV: {LECTURER_ID} (tài khoản giangvien/123456)")
        print(f"10 SV: {MSSVS[0]} ... {MSSVS[-1]} (mật khẩu 123456)")
        print("Đăng nhập giangvien/123456 -> Điểm danh nhanh -> chọn lớp TESTD01-N")
    finally:
        db.close()


if __name__ == "__main__":
    main()
