"""
SEED DATA HOÀN CHỈNH — dữ liệu nhất quán để demo MỌI tính năng.

Chạy (từ gốc dự án):  .venv/bin/python seed_full.py
Idempotent: chạy lại nhiều lần không lỗi, không ghi đè.

Dữ liệu tạo ra:
- Khoa / Ngành (CNTT, ATTT)
- Môn học với chuỗi tiên quyết / học trước / song hành
- Giảng viên (3 GV + tài khoản giangvien)
- ~20 sinh viên đầy đủ hồ sơ + BẢNG ĐIỂM (để check tiên quyết)
- Lớp tín chỉ đúng học kỳ/niên khóa/khóa (đăng ký được)
- Đăng ký học, lịch học (schedules + sessions), điểm danh (đủ để có Cảnh báo/Cấm thi)
- Đơn nghỉ phép (pending/approved)
"""
import os
import sys
import random

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "backend"))

import bcrypt
from datetime import datetime, timedelta, date, time

from app.db.session import SessionLocal
from app.models import (
    Account, UserProfile, Student, Lecturer, Subject, CreditClass,
    StudentClassEnrollment, ClassSchedule, ClassSession, AttendanceRecord,
    LeaveRequest, Faculty, Major, Grade, Classroom,
)

random.seed(42)

SEM = 1
YEAR = "2025-2026"
COHORT = "D22"


def _hash(pw): return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def ensure_faculty(db, fid, name):
    f = db.query(Faculty).filter_by(faculty_id=fid).first()
    if not f:
        f = Faculty(faculty_id=fid, faculty_name=name); db.add(f); db.flush()
    return f


def ensure_major(db, mid, name, fid):
    m = db.query(Major).filter_by(major_id=mid).first()
    if not m:
        m = Major(major_id=mid, major_name=name, faculty_id=fid); db.add(m); db.flush()
    return m


def ensure_account(db, username, role="sinh_vien"):
    a = db.query(Account).filter_by(username=username.lower()).first()
    if not a:
        a = Account(username=username.lower(), password_hash=_hash("123456"), role=role, is_active=True)
        db.add(a); db.flush()
    return a


def ensure_lecturer(db, lid, name, email, fid, title):
    lec = db.query(Lecturer).filter_by(lecturer_id=lid).first()
    if lec:
        return lec
    acc = ensure_account(db, lid, "giang_vien")
    p = UserProfile(account_id=acc.account_id, full_name=name, personal_email=email, phone_number="09%08d" % random.randint(10000000, 99999999))
    db.add(p); db.flush()
    lec = Lecturer(lecturer_id=lid, profile_id=p.profile_id, faculty_id=fid,
                   academic_title=title, position="Giảng viên", teaching_status="Active")
    db.add(lec); db.flush()
    return lec


# (subject_id, name, credits, semester, prereq, predecessor, corequisite, subject_type)
SUBJECTS = [
    ("INT1152", "Nhập môn lập trình (C)", 3, 1, None, None, None, "Bắt buộc"),
    ("INT1306", "Lập trình C nâng cao", 4, 1, "INT1152", None, None, "Bắt buộc"),
    ("INT1310", "Lập trình hướng đối tượng", 3, 2, "INT1152", None, None, "Bắt buộc"),
    ("INT3013", "Cấu trúc dữ liệu & giải thuật", 3, 2, "INT1306", "INT1152", None, "Bắt buộc"),
    ("INT1339", "Trí tuệ nhân tạo", 3, 5, None, None, "INT1152", "Tự chọn"),
    ("INT1408", "Phát triển ứng dụng Web", 3, 3, None, "INT1152", None, "Bắt buộc"),
    ("INT1416", "Học máy chuyên sâu", 3, 6, "INT1339", None, None, "Tự chọn"),
]


def ensure_subject(db, sid, name, credits, sem, prereq, pred, coreq, stype="Bắt buộc", major_ids="MaCNTT"):
    s = db.query(Subject).filter_by(subject_id=sid).first()
    if not s:
        s = Subject(subject_id=sid, subject_name=name, credits=credits,
                    theory_credits=credits, practical_credits=0, total_periods=credits * 15,
                    semester=sem)
        db.add(s); db.flush()
    s.subject_name = name
    s.credits = credits
    s.semester = sem
    s.prerequisites = prereq
    s.predecessors = pred
    s.corequisites = coreq
    s.subject_type = stype
    s.major_ids = major_ids
    return s


def ensure_class(db, cid, sid, lid, sem, year, cohort, max_sv):
    c = db.query(CreditClass).filter_by(class_id=cid).first()
    if not c:
        c = CreditClass(class_id=cid, subject_id=sid, lecturer_id=lid, semester=sem,
                        academic_year=year, cohort=cohort, max_students=max_sv,
                        current_students=0, group_number=1, status="Active")
        db.add(c); db.flush()
    return c


def ensure_student(db, mssv, name, admin_class, fid, mid, dob, gender):
    s = db.query(Student).filter_by(student_id=mssv).first()
    if s:
        return s
    acc = ensure_account(db, mssv)
    p = UserProfile(account_id=acc.account_id, full_name=name, personal_email=f"{mssv.lower()}@ptit.edu.vn",
                    phone_number="09%08d" % random.randint(10000000, 99999999), date_of_birth=dob, gender=gender,
                    citizen_id="%012d" % random.randint(100000000000, 999999999999), ethnicity="Kinh", religion="Không",
                    nationality="Việt Nam", place_of_birth=random.choice(["Hà Nội", "Đà Nẵng", "TP.HCM", "Đắk Lắk"]),
                    address=f"{random.randint(1,199)} Đường Demo, Hà Nội")
    db.add(p); db.flush()
    s = Student(student_id=mssv, profile_id=p.profile_id, administrative_class_id=admin_class,
                major_id=mid, faculty_id=fid, cohort=COHORT, training_program="Đại học chính quy",
                academic_status="Đang học", tuition_debt=0)
    db.add(s); db.flush()
    return s


def ensure_enroll(db, cid, mssv):
    e = db.query(StudentClassEnrollment).filter_by(class_id=cid, student_id=mssv).first()
    if not e:
        db.add(StudentClassEnrollment(class_id=cid, student_id=mssv, academic_status="Active")); db.flush()


def ensure_grade(db, mssv, sid, score, sem):
    g = db.query(Grade).filter_by(student_id=mssv, subject_id=sid).first()
    if not g:
        db.add(Grade(student_id=mssv, subject_id=sid, score=score, semester=sem,
                     status="Passed" if score >= 5 else "Failed")); db.flush()


def ensure_room(db, rid, name):
    r = db.query(Classroom).filter_by(room_id=rid).first()
    if not r:
        db.add(Classroom(room_id=rid, room_name=name, building="A2", campus="Hà Nội",
                         room_number=rid, capacity=50, room_type="Theory", status="Active"))
        db.flush()
    return r


def main():
    db = SessionLocal()
    try:
        print("=== 1. Khoa / Ngành ===")
        f_cntt = ensure_faculty(db, "FaCNTT", "Công nghệ thông tin")
        f_attt = ensure_faculty(db, "FaATTT", "An toàn thông tin")
        m_cntt = ensure_major(db, "MaCNTT", "Công nghệ thông tin", f_cntt.faculty_id)
        ensure_major(db, "MaATTT", "An toàn thông tin", f_attt.faculty_id)
        db.commit()

        print("=== 2. Môn học (chuỗi tiên quyết + CTĐT) ===")
        subs = {}
        for sid, name, cr, sem, pre, pred, coreq, stype in SUBJECTS:
            subs[sid] = ensure_subject(db, sid, name, cr, sem, pre, pred, coreq, stype, "MaCNTT")
        db.commit()

        print("=== 3. Giảng viên ===")
        gv1 = ensure_lecturer(db, "GV001", "Nguyễn Văn Hùng", "hungnv@ptit.edu.vn", f_cntt.faculty_id, "TS.")
        gv2 = ensure_lecturer(db, "GV002", "Trần Thị Mai", "maitt@ptit.edu.vn", f_cntt.faculty_id, "ThS.")
        gv3 = ensure_lecturer(db, "GV003", "Phạm Đức Long", "longpd@ptit.edu.vn", f_attt.faculty_id, "PGS.TS.")
        # tài khoản demo giangvien trỏ về GV001
        gv_acc = db.query(Account).filter_by(username="giangvien").first()
        if not gv_acc:
            gv_acc = ensure_account(db, "giangvien", "giang_vien")
        if gv1.profile and not gv1.profile.account_id:
            gv1.profile.account_id = gv_acc.account_id
        db.commit()

        print("=== 4. Lớp tín chỉ (đúng kỳ 1 - 2025-2026, khóa D22) ===")
        # Lớp cho môn kỳ 1, 2; môn kỳ 5-6 không mở ở đợt này (để demo chặn học kỳ)
        cls = {
            "INT1152": ensure_class(db, "D22CQCNPM02-N", "INT1152", gv1.lecturer_id, 1, YEAR, COHORT, 45),
            "INT1306": ensure_class(db, "D22CQCNPM01-N", "INT1306", gv1.lecturer_id, 1, YEAR, COHORT, 40),
            "INT1310": ensure_class(db, "D22CQCNTT03-N", "INT1310", gv2.lecturer_id, 2, YEAR, COHORT, 40),
            "INT3013": ensure_class(db, "D22CQCNPM03-N", "INT3013", gv2.lecturer_id, 2, YEAR, COHORT, 35),
        }
        # Môn kỳ 5/6 để ở kỳ khác -> demo "khác học kỳ đang đăng ký"
        ensure_class(db, "D22CQCNTT05-N", "INT1339", gv3.lecturer_id, 5, YEAR, COHORT, 30)
        db.commit()

        print("=== 5. Sinh viên (20 SV) + bảng điểm ===")
        names = [
            "Nguyễn Văn An", "Trần Thị Bích", "Lê Hoàng Cường", "Phạm Minh Dũng", "Hoàng Thị Em",
            "Đỗ Văn Phúc", "Bùi Thị Giang", "Vũ Đức Hải", "Ngô Thị Hạnh", "Đặng Văn Hiếu",
            "Lý Minh Khôi", "Mai Thùy Linh", "Nguyễn Thị Mai", "Phan Quốc Nam", "Quách Thị Oanh",
            "Tô Văn Phát", "Uông Thị Quỳnh", "Võ Minh Sang", "Ngô Văn Tâm", "Trịnh Thị Uyên",
        ]
        students = []
        for i, name in enumerate(names):
            mssv = f"N22DCCN{160 + i}"
            dob = date(2004, (i % 12) + 1, (i % 27) + 1)
            students.append(ensure_student(db, mssv, name, "D22CQCNPM01", f_cntt.faculty_id, m_cntt.major_id, dob,
                                           "Nam" if i % 2 == 0 else "Nữ"))

        # Bảng điểm: 16/20 đã ĐẬU INT1152; 2 rớt; 2 chưa học
        for i, s in enumerate(students):
            if i < 16:
                ensure_grade(db, s.student_id, "INT1152", round(random.uniform(5.5, 9.5), 1), 1)
            elif i < 18:
                ensure_grade(db, s.student_id, "INT1152", round(random.uniform(2.0, 4.5), 1), 1)  # rớt
            # một số đã đậu INT1306 (để đăng ký INT3013)
            if i < 6:
                ensure_grade(db, s.student_id, "INT1306", round(random.uniform(5.0, 9.0), 1), 2)
        db.commit()

        print("=== 6. Đăng ký học ===")
        # 16 SV đã đậu INT1152 -> đăng ký INT1306
        for i, s in enumerate(students):
            ensure_enroll(db, cls["INT1152"].class_id, s.student_id)   # tất cả học INT1152
            if i < 16:
                ensure_enroll(db, cls["INT1306"].class_id, s.student_id)  # đậu -> học INT1306
            if i < 6:
                ensure_enroll(db, cls["INT3013"].class_id, s.student_id)  # đậu INT1306 -> học CTDL
        # Đồng bộ sĩ số
        for c in cls.values():
            c.current_students = db.query(StudentClassEnrollment).filter_by(class_id=c.class_id).count()
        db.commit()

        print("=== 7. Lịch học (schedules + sessions quá khứ + tương lai) ===")
        ensure_room(db, "A2-301", "Phòng 301 - A2")
        ensure_room(db, "B1-402", "Phòng 402 - B1")
        db.commit()
        today = date.today()
        for off in range(-14, 8):  # 14 ngày trước -> 7 ngày sau
            d = today + timedelta(days=off)
            # INT1152: thứ 2,4 (giả định)
            if d.weekday() in (0, 3):
                ensure_sched(db, cls["INT1152"].class_id, d, "A2-301", 7, 30)
                ensure_session(db, cls["INT1152"].class_id, d, "A2-301", 7, 30)
            if d.weekday() in (1, 4):
                ensure_sched(db, cls["INT1306"].class_id, d, "B1-402", 9, 0)
                ensure_session(db, cls["INT1306"].class_id, d, "B1-402", 9, 0)
        db.commit()

        print("=== 8. Điểm danh (để có Cảnh báo / Cấm thi) ===")
        # Với mỗi buổi INT1152 đã qua, đánh: 60% có mặt, 20% muộn, 20% vắng
        for sess in db.query(ClassSession).filter(ClassSession.class_id == cls["INT1152"].class_id,
                                                  ClassSession.session_date < today).all():
            enrolled = db.query(StudentClassEnrollment).filter_by(class_id=cls["INT1152"].class_id).all()
            for idx, e in enumerate(enrolled):
                if db.query(AttendanceRecord).filter_by(student_id=e.student_id, session_id=sess.session_id).first():
                    continue
                r = idx % 10
                if r < 6:
                    status = "Đúng giờ"
                elif r < 8:
                    status = "Đi muộn"
                else:
                    status = "Vắng"
                db.add(AttendanceRecord(student_id=e.student_id, session_id=sess.session_id,
                                        status=status, recorded_at=sess.start_time,
                                        confidence_score=0.9, source="AI"))
        db.commit()

        print("=== 9. Đơn nghỉ phép mẫu ===")
        if db.query(LeaveRequest).filter_by(student_id=students[0].student_id).first() is None:
            db.add(LeaveRequest(student_id=students[0].student_id, schedule_id=None, session_id=None,
                                reason="Bận việc gia đình", evidence="Giấy xác nhận", status="Pending"))
            db.add(LeaveRequest(student_id=students[1].student_id, schedule_id=None, session_id=None,
                                reason="Bị ốm", evidence="Giấy ra viện", status="Approved"))
        db.commit()

        # Cập nhật lecturer_id của tài khoản giangvien -> GV001 (cho phân quyền)
        db.commit()

        print()
        print("=" * 62)
        print("  DỮ LIỆU HOÀN CHỈNH ĐÃ SẴN SÀNG")
        print("=" * 62)
        print("  TÀI KHOẢN (mật khẩu đều 123456):")
        print("   Admin   : admin")
        print("   GV      : giangvien")
        print("   SV      : N22DCCN160 ... N22DCCN179")
        print()
        print("  LUỒNG DEMO:")
        print("   1. SV N22DCCN160 (đậu INT1152) -> đăng ký INT1306: ĐƯỢC")
        print("   2. SV N22DCCN176 (rớt INT1152) -> đăng ký INT1306: CHẶN tiên quyết")
        print("   3. SV N22DCCN178 (chưa học) -> đăng ký INT1306: CHẶN tiên quyết")
        print("   4. Lớp D22CQCNTT05-N (kỳ 5) -> CHẶN khác học kỳ")
        print("   5. GV giangvien -> Tổng kết & Cấm thi: thấy dashboard môn + Cấm thi")
        print("   6. GV giangvien -> Điểm danh nhanh: danh sách SV + điểm danh thủ công")
    except Exception as e:
        db.rollback()
        import traceback; traceback.print_exc()
    finally:
        db.close()


def ensure_sched(db, cid, d, room, h, m):
    if db.query(ClassSchedule).filter_by(class_id=cid, study_date=d, room=room).first():
        return
    db.add(ClassSchedule(class_id=cid, study_date=d, room=room, start_time=time(h, m)))


def ensure_session(db, cid, d, room, h, m):
    if db.query(ClassSession).filter_by(class_id=cid, session_date=d).first():
        return
    st = datetime.combine(d, time(h, m))
    db.add(ClassSession(class_id=cid, room_id=room, session_date=d, shift=1,
                        start_time=st, end_time=st + timedelta(hours=3),
                        session_type="Theory", status="Scheduled"))


if __name__ == "__main__":
    main()
