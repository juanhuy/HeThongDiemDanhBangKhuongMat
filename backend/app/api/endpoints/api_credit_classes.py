from fastapi import APIRouter, Depends, HTTPException, Form, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.subject import Subject
from app.models.credit_class import CreditClass
from app.models.student_class import StudentClassEnrollment
from app.models.class_schedule import ClassSchedule
from app.models.attendance_history import AttendanceHistory
from app.models.student import Student
from datetime import datetime
from typing import Optional

import os
import sys
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
if project_root not in sys.path:
    sys.path.append(project_root)

from config.settings import settings
from app.services.demo_service import get_demo_controls
from app.core.require import get_current_user, require_admin, require_roles
from app.core.student_status import is_active_student
from app.core.audit import log_audit

router = APIRouter()

# =========================================================================
# Các hàm tiện ích phục vụ chuẩn hóa đăng ký học phần
# =========================================================================

def _get_registration_config():
    """Đọc cấu hình đợt đăng ký từ config.yaml"""
    reg = settings.registration or {}
    def _int(v, default=0):
        try:
            return int(v)
        except (TypeError, ValueError):
            return default
    semester_val = reg.get("semester")
    return {
        "semester": _int(semester_val) if semester_val not in (None, "") else None,
        "academic_year": (reg.get("academic_year") or "").strip() or None,
        "open_date": (reg.get("open_date") or "").strip(),
        "close_date": (reg.get("close_date") or "").strip(),
        "min_credits": _int(reg.get("min_credits"), 6),
        "max_credits": _int(reg.get("max_credits"), 25),
    }


def _enrolled_count(db: Session, class_id: str) -> int:
    """Đếm số sinh viên đang đăng ký lớp tín chỉ"""
    return db.query(StudentClassEnrollment).filter(
        StudentClassEnrollment.class_id == class_id
    ).count()


def _student_enrolled_credits(db: Session, student_id: str, exclude_class_ids=()) -> int:
    """Tính tổng số tín chỉ các lớp sinh viên đang đăng ký"""
    query = db.query(StudentClassEnrollment).filter(
        StudentClassEnrollment.student_id == student_id
    )
    if exclude_class_ids:
        query = query.filter(StudentClassEnrollment.class_id.notin_(list(exclude_class_ids)))
    total = 0
    for e in query.all():
        if e.credit_class and e.credit_class.subject:
            total += e.credit_class.subject.credits or 0
    return total


def _parse_prerequisites(subject) -> list:
    """Tách danh sách mã môn tiên quyết từ chuỗi 'MA1, MA2, ...'"""
    if not subject or not subject.prerequisites:
        return []
    raw = subject.prerequisites
    for sep in [",", ";", "|", "/"]:
        raw = raw.replace(sep, ",")
    return [p.strip().upper() for p in raw.split(",") if p.strip()]


def _validate_registration(db: Session, student: Student, cc: CreditClass,
                           extra_count: int = 0, exclude_class_ids=()):
    """
    Kiểm tra toàn bộ quy định đăng ký học phần.
    Trả về (True, "") nếu hợp lệ, ngược lại (False, thông báo lỗi).
    """
    demo = get_demo_controls(db)
    reg = _get_registration_config()
    now = datetime.now()

    # 1. Đợt đăng ký đang mở
    open_date, close_date = reg.get("open_date"), reg.get("close_date")
    if open_date and close_date and not demo["bypass_registration_window"]:
        try:
            od = datetime.strptime(open_date, "%Y-%m-%d").date()
            cd = datetime.strptime(close_date, "%Y-%m-%d").date()
            if not (od <= now.date() <= cd):
                return False, (f"Đang ngoài đợt đăng ký học phần (mở {od.strftime('%d/%m/%Y')} "
                               f"đến {cd.strftime('%d/%m/%Y')}).")
        except ValueError:
            pass

    # 2. Lớp đang mở đăng ký
    if (cc.status or "Active").strip().lower() != "active":
        return False, f"Lớp {cc.class_id} không trong trạng thái mở đăng ký (hiện: {cc.status})."

    # 3. Học kỳ / niên khóa hiện tại
    cur_sem = reg.get("semester")
    cur_year = reg.get("academic_year")
    if cc.semester is not None and cur_sem is not None and int(cc.semester) != int(cur_sem) \
            and not demo["bypass_semester"]:
        return False, (f"Lớp {cc.class_id} thuộc học kỳ {cc.semester}, "
                       f"khác học kỳ đang đăng ký ({cur_sem}).")
    if cc.academic_year and cur_year and cc.academic_year.strip() != cur_year.strip() \
            and not demo["bypass_semester"]:
        return False, (f"Lớp {cc.class_id} thuộc niên khóa {cc.academic_year}, "
                       f"khác niên khóa đang đăng ký ({cur_year}).")

    # 4. Sĩ số tối đa
    if not demo["bypass_capacity"]:
        max_sv = int(cc.max_students or 50)
        used = _enrolled_count(db, cc.class_id) + extra_count
        if used >= max_sv:
            return False, f"Lớp {cc.class_id} đã đủ sĩ số ({used}/{max_sv})."

    # 5. Trạng thái học vụ của sinh viên
    if not demo["bypass_eligibility"]:
        if not is_active_student(student.academic_status):
            return False, (f"Sinh viên đang ở trạng thái '{student.academic_status}', "
                           f"không đủ điều kiện đăng ký môn học.")

    # 6. Ràng buộc khóa học
    if not demo["bypass_eligibility"]:
        if cc.cohort and student.cohort:
            c = cc.cohort.strip().upper()
            s = student.cohort.strip().upper()
            if c not in s and s not in c:
                return False, (f"Lớp {cc.class_id} chỉ mở cho khóa {cc.cohort}, "
                               f"không dành cho khóa {student.cohort}.")

    # 7. Chống đăng ký trùng môn (đang học ở lớp khác)
    if not demo["bypass_duplicate_subject"]:
        dup = db.query(StudentClassEnrollment).join(CreditClass).filter(
            StudentClassEnrollment.student_id == student.student_id,
            StudentClassEnrollment.class_id != cc.class_id,
            CreditClass.subject_id == cc.subject_id
        ).first()
        if dup:
            return False, (f"Bạn đã đăng ký môn {cc.subject.subject_name if cc.subject else cc.subject_id} "
                           f"ở lớp {dup.class_id}. Không thể đăng ký trùng môn.")

    # 8. Môn tiên quyết
    if not demo["bypass_prerequisites"]:
        for prereq in _parse_prerequisites(cc.subject):
            had = db.query(StudentClassEnrollment).join(CreditClass).filter(
                StudentClassEnrollment.student_id == student.student_id,
                CreditClass.subject_id == prereq
            ).first()
            if not had:
                pre_subj = db.query(Subject).filter(Subject.subject_id == prereq).first()
                label = f"{prereq} ({pre_subj.subject_name})" if pre_subj else prereq
                return False, f"Chưa đủ môn tiên quyết: {label}."

    # 9. Giới hạn số tín chỉ
    if not demo["bypass_credit_limit"]:
        min_credits = int(reg.get("min_credits", 0) or 0)
        max_credits = int(reg.get("max_credits", 0) or 0)
        new_credits = cc.subject.credits if cc.subject and cc.subject.credits else 0
        exclude = list(exclude_class_ids)
        if cc.class_id not in exclude:
            exclude.append(cc.class_id)
        cur_total = _student_enrolled_credits(db, student.student_id, exclude_class_ids=exclude)
        if max_credits and cur_total + new_credits > max_credits:
            return False, (f"Vượt quá số tín chỉ tối đa được đăng ký ({max_credits} tín chỉ): "
                           f"hiện có {cur_total}, thêm {new_credits} = {cur_total + new_credits}.")

    return True, ""

@router.post("/lop_tin_chi", dependencies=[Depends(require_admin)])
def add_credit_class(
    ma_lop_tc: str = Form(...), 
    ma_mon: str = Form(...), 
    ma_gv: Optional[str] = Form(None),
    hoc_ky: Optional[int] = Form(None),
    nam_hoc: Optional[str] = Form(None),
    si_so_toi_da: Optional[int] = Form(None),
    khoa: Optional[str] = Form(None),
    trang_thai: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    sub = db.query(Subject).filter(Subject.subject_id == ma_mon.strip().upper()).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Khong tim thay mon hoc {ma_mon}")

    status_val = trang_thai.strip() if trang_thai and trang_thai.strip() else "Active"

    existing = db.query(CreditClass).filter(CreditClass.class_id == ma_lop_tc.strip()).first()
    if existing:
        if ma_gv:
            existing.lecturer_id = ma_gv.strip()
        if hoc_ky is not None:
            existing.semester = hoc_ky
        if nam_hoc is not None:
            existing.academic_year = nam_hoc.strip() or None
        if khoa is not None:
            existing.cohort = khoa.strip() or None
        if si_so_toi_da is not None:
            existing.max_students = si_so_toi_da
        existing.status = existing.status or "Active"
        db.commit()
        log_audit(db, actor_username=current_user.get("username"), actor_role=current_user.get("role"),
                  action="UPDATE", target="credit_classes", target_id=ma_lop_tc, detail="Cập nhật lớp tín chỉ (qua POST)")
        return {"status": "success", "message": f"Da them lop tin chi: {ma_lop_tc}"}

    new_cc = CreditClass(
        class_id=ma_lop_tc.strip(), 
        subject_id=ma_mon.strip().upper(),
        lecturer_id=ma_gv.strip() if ma_gv else None,
        semester=hoc_ky,
        academic_year=nam_hoc.strip() if nam_hoc else None,
        cohort=khoa.strip() if khoa else None,
        max_students=si_so_toi_da if si_so_toi_da else 50,
        current_students=0,
        status=status_val
    )
    db.add(new_cc)
    db.commit()
    log_audit(db, actor_username=current_user.get("username"), actor_role=current_user.get("role"),
              action="CREATE", target="credit_classes", target_id=ma_lop_tc, detail=f"Tạo lớp tín chỉ (môn {ma_mon})")
    return {"status": "success", "message": f"Da them lop tin chi: {ma_lop_tc}"}


@router.put("/lop_tin_chi/{ma_lop_tc}", dependencies=[Depends(require_admin)])
def update_credit_class(
    ma_lop_tc: str,
    ma_gv: Optional[str] = Form(None),
    hoc_ky: Optional[int] = Form(None),
    nam_hoc: Optional[str] = Form(None),
    si_so_toi_da: Optional[int] = Form(None),
    khoa: Optional[str] = Form(None),
    trang_thai: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Cập nhật thông tin lớp tín chỉ (giảng viên, sĩ số, kỳ, khóa, trạng thái)."""
    cc = db.query(CreditClass).filter(CreditClass.class_id == ma_lop_tc.strip()).first()
    if not cc:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp tín chỉ {ma_lop_tc}")

    if ma_gv is not None:
        cc.lecturer_id = ma_gv.strip() or None
    if hoc_ky is not None:
        cc.semester = hoc_ky
    if nam_hoc is not None:
        cc.academic_year = nam_hoc.strip() or None
    if si_so_toi_da is not None:
        cc.max_students = si_so_toi_da
    if khoa is not None:
        cc.cohort = khoa.strip() or None
    if trang_thai is not None:
        cc.status = trang_thai.strip() or "Active"

    db.add(cc)
    db.commit()
    log_audit(db, actor_username=current_user.get("username"), actor_role=current_user.get("role"),
              action="UPDATE", target="credit_classes", target_id=ma_lop_tc,
              detail=f"Cập nhật lớp tín chỉ {ma_lop_tc}")
    return {"status": "success", "message": f"Đã cập nhật lớp tín chỉ {ma_lop_tc}"}


@router.delete("/lop_tin_chi/{ma_lop_tc}", dependencies=[Depends(require_admin)])
def delete_credit_class(ma_lop_tc: str, db: Session = Depends(get_db),
                        current_user: dict = Depends(get_current_user)):
    """Xóa lớp tín chỉ (các lịch học và đăng ký liên quan sẽ bị xóa theo)."""
    cc = db.query(CreditClass).filter(CreditClass.class_id == ma_lop_tc.strip()).first()
    if not cc:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp tín chỉ {ma_lop_tc}")
    db.delete(cc)
    db.commit()
    log_audit(db, actor_username=current_user.get("username"), actor_role=current_user.get("role"),
              action="DELETE", target="credit_classes", target_id=ma_lop_tc, detail="Xóa lớp tín chỉ")
    return {"status": "success", "message": f"Đã xóa lớp tín chỉ {ma_lop_tc}"}


@router.post("/sinh_vien_lop_tin_chi")
def enroll_student(ma_lop_tc: str = Form(...), mssv: str = Form(...), db: Session = Depends(get_db),
                   current_user: dict = Depends(get_current_user)):
    # Sinh viên chỉ được đăng ký cho chính mình
    if current_user["role"] == "sinh_vien":
        if not current_user.get("mssv") or current_user["mssv"].upper() != mssv.strip().upper():
            raise HTTPException(status_code=403, detail="Sinh viên chỉ có thể đăng ký cho chính mình.")
    cc = db.query(CreditClass).filter(CreditClass.class_id == ma_lop_tc.strip()).first()
    if not cc:
        raise HTTPException(status_code=404, detail=f"Khong tim thay lop tin chi {ma_lop_tc}")
    
    st = db.query(Student).filter(Student.student_id == mssv.strip().upper()).first()
    if not st:
        raise HTTPException(status_code=404, detail=f"Khong tim thay sinh vien {mssv}")
        
    existing = db.query(StudentClassEnrollment).filter(
        StudentClassEnrollment.class_id == ma_lop_tc.strip(),
        StudentClassEnrollment.student_id == mssv.strip().upper()
    ).first()
    if existing:
        return {"status": "success", "message": f"Da dang ky sinh vien {mssv} vao lop {ma_lop_tc}"}

    # Kiểm tra toàn bộ quy định đăng ký học phần (đợt, kỳ, sĩ số, tiên quyết, khóa, trùng môn, tín chỉ, học vụ)
    ok, err = _validate_registration(db, st, cc)
    if not ok:
        raise HTTPException(status_code=400, detail=err)

    # Kiểm tra trùng lịch học với các lớp sinh viên đã đăng ký
    new_schedules = db.query(ClassSchedule).filter(ClassSchedule.class_id == ma_lop_tc.strip()).all()
    if new_schedules:
        enrolled = db.query(StudentClassEnrollment).filter(
            StudentClassEnrollment.student_id == mssv.strip().upper()
        ).all()
        enrolled_class_ids = [e.class_id for e in enrolled if e.class_id != ma_lop_tc.strip()]
        
        if enrolled_class_ids:
            existing_schedules = db.query(ClassSchedule).filter(
                ClassSchedule.class_id.in_(enrolled_class_ids)
            ).all()
            
            for ns in new_schedules:
                ns_seconds = ns.start_time.hour * 3600 + ns.start_time.minute * 60 + ns.start_time.second
                for es in existing_schedules:
                    if ns.study_date == es.study_date:
                        es_seconds = es.start_time.hour * 3600 + es.start_time.minute * 60 + es.start_time.second
                        if abs(ns_seconds - es_seconds) < 10800:
                            date_str = ns.study_date.strftime("%d/%m/%Y")
                            ns_time = ns.start_time.strftime("%H:%M")
                            es_time = es.start_time.strftime("%H:%M")
                            raise HTTPException(
                                status_code=400,
                                detail=f"Trùng lịch học! Ngày {date_str}: Lớp {ma_lop_tc.strip()} ({ns_time}) bị trùng giờ với lớp {es.class_id} ({es_time}) bạn đã đăng ký."
                            )

    enroll = StudentClassEnrollment(
        class_id=ma_lop_tc.strip(),
        student_id=mssv.strip().upper(),
        academic_status="Active"
    )
    db.add(enroll)
    if cc.current_students is None:
        cc.current_students = 0
    cc.current_students = _enrolled_count(db, cc.class_id) + 1
    db.commit()
    return {"status": "success", "message": f"Da dang ky sinh vien {mssv} vao lop {ma_lop_tc}"}


@router.delete("/sinh_vien_lop_tin_chi/{ma_lop_tc}/{mssv}")
def unenroll_student(ma_lop_tc: str, mssv: str, db: Session = Depends(get_db),
                     current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "sinh_vien":
        if not current_user.get("mssv") or current_user["mssv"].upper() != mssv.strip().upper():
            raise HTTPException(status_code=403, detail="Sinh viên không thể hủy đăng ký của người khác.")
    enrollment = db.query(StudentClassEnrollment).filter(
        StudentClassEnrollment.class_id == ma_lop_tc.strip(),
        StudentClassEnrollment.student_id == mssv.strip().upper()
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin đăng ký học của sinh viên này.")

    # Chặn hủy nếu SV đã có bản ghi điểm danh trong lớp này (đã cam kết học)
    demo = get_demo_controls(db)
    if not demo.get("allow_unenroll_after_attendance"):
        schedule_ids = [s.schedule_id for s in db.query(ClassSchedule).filter(ClassSchedule.class_id == ma_lop_tc.strip()).all()]
        if schedule_ids:
            had = db.query(AttendanceHistory).filter(
                AttendanceHistory.student_id == mssv.strip().upper(),
                AttendanceHistory.schedule_id.in_(schedule_ids),
            ).first()
            if had:
                raise HTTPException(status_code=400,
                                    detail="Không thể hủy đăng ký: sinh viên đã có buổi điểm danh trong lớp này.")

    cc = db.query(CreditClass).filter(CreditClass.class_id == ma_lop_tc.strip()).first()
    db.delete(enrollment)
    if cc:
        if cc.current_students is None:
            cc.current_students = 0
        cc.current_students = max(0, _enrolled_count(db, cc.class_id) - 1)
    db.commit()
    return {"status": "success", "message": f"Đã hủy đăng ký lớp {ma_lop_tc} thành công."}

@router.post("/sinh_vien_lop_tin_chi/bulk_administrative", dependencies=[Depends(require_roles("giang_vien", "admin"))])
def enroll_bulk_administrative_class(
    ma_lop_tc: str = Form(...),
    lop_hanh_chinh: str = Form(...),
    db: Session = Depends(get_db)
):
    cc = db.query(CreditClass).filter(CreditClass.class_id == ma_lop_tc.strip()).first()
    if not cc:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp tín chỉ {ma_lop_tc}")
    
    students = db.query(Student).filter(Student.administrative_class == lop_hanh_chinh.strip()).all()
    if not students:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy sinh viên nào thuộc lớp hành chính {lop_hanh_chinh}")
    
    new_schedules = db.query(ClassSchedule).filter(ClassSchedule.class_id == ma_lop_tc.strip()).all()
    count = 0
    skipped_conflict = 0
    skipped_invalid = 0
    for st in students:
        existing = db.query(StudentClassEnrollment).filter(
            StudentClassEnrollment.class_id == ma_lop_tc.strip(),
            StudentClassEnrollment.student_id == st.student_id
        ).first()
        
        if not existing:
            # Kiểm tra quy định đăng ký (đợt, kỳ, sĩ số, tiên quyết, khóa, trùng môn, tín chỉ, học vụ)
            ok, err = _validate_registration(db, st, cc, extra_count=count)
            if not ok:
                skipped_invalid += 1
                continue

            has_conflict = False
            if new_schedules:
                enrolled = db.query(StudentClassEnrollment).filter(
                    StudentClassEnrollment.student_id == st.student_id
                ).all()
                enrolled_class_ids = [e.class_id for e in enrolled if e.class_id != ma_lop_tc.strip()]
                if enrolled_class_ids:
                    existing_schedules = db.query(ClassSchedule).filter(
                        ClassSchedule.class_id.in_(enrolled_class_ids)
                    ).all()
                    for ns in new_schedules:
                        ns_seconds = ns.start_time.hour * 3600 + ns.start_time.minute * 60 + ns.start_time.second
                        for es in existing_schedules:
                            if ns.study_date == es.study_date:
                                es_seconds = es.start_time.hour * 3600 + es.start_time.minute * 60 + es.start_time.second
                                if abs(ns_seconds - es_seconds) < 10800:
                                    has_conflict = True
                                    break
                        if has_conflict:
                            break

            if has_conflict:
                skipped_conflict += 1
                continue

            enroll = StudentClassEnrollment(
                class_id=ma_lop_tc.strip(),
                student_id=st.student_id,
                academic_status="Active"
            )
            db.add(enroll)
            count += 1
            
    cc.current_students = _enrolled_count(db, cc.class_id) + count
    db.commit()
    msg = f"Đã đăng ký thành công {count} sinh viên của lớp {lop_hanh_chinh} vào lớp tín chỉ {ma_lop_tc}."
    if skipped_conflict > 0:
        msg += f" (Bỏ qua {skipped_conflict} sinh viên do bị trùng lịch học)."
    if skipped_invalid > 0:
        msg += f" (Bỏ qua {skipped_invalid} sinh viên không đủ điều kiện đăng ký)."
    return {
        "status": "success",
        "message": msg
    }

@router.post("/lich_hoc_chi_tiet", dependencies=[Depends(require_admin)])
def add_schedule(
    ma_lop_tc: str = Form(...),
    ngay_hoc: str = Form(...), 
    phong_hoc: str = Form(...),
    gio_bat_dau: str = Form(...), 
    db: Session = Depends(get_db)
):
    cc = db.query(CreditClass).filter(CreditClass.class_id == ma_lop_tc.strip()).first()
    if not cc:
        raise HTTPException(status_code=404, detail=f"Khong tim thay lop tin chi {ma_lop_tc}")
        
    try:
        dt_date = datetime.strptime(ngay_hoc.strip(), "%Y-%m-%d").date()
        dt_time = datetime.strptime(gio_bat_dau.strip(), "%H:%M:%S").time()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Dinh dang ngay (YYYY-MM-DD) hoac gio (HH:MM:SS) khong hop le: {e}")

    # Kiểm tra xem phòng học có bị trùng lịch vào giờ này không (thời lượng mỗi buổi học là 3 tiếng - 10800 giây)
    conflicts = db.query(ClassSchedule).filter(
        ClassSchedule.room == phong_hoc.strip(),
        ClassSchedule.study_date == dt_date
    ).all()
    
    for c in conflicts:
        c_seconds = c.start_time.hour * 3600 + c.start_time.minute * 60 + c.start_time.second
        new_seconds = dt_time.hour * 3600 + dt_time.minute * 60 + dt_time.second
        if abs(c_seconds - new_seconds) < 10800:
            conflict_class_id = c.class_id
            conflict_time_str = c.start_time.strftime("%H:%M")
            raise HTTPException(
                status_code=400, 
                detail=f"Trùng lịch: Phòng {phong_hoc.strip()} đã có lớp {conflict_class_id} học lúc {conflict_time_str} cùng ngày."
            )

    # Kiểm tra trùng lịch giảng viên (thời lượng lệch dưới 3 tiếng)
    if cc.lecturer_id:
        lecturer_conflicts = db.query(ClassSchedule).join(CreditClass).filter(
            CreditClass.lecturer_id == cc.lecturer_id,
            ClassSchedule.study_date == dt_date,
            ClassSchedule.class_id != ma_lop_tc.strip()
        ).all()
        for lc in lecturer_conflicts:
            lc_seconds = lc.start_time.hour * 3600 + lc.start_time.minute * 60 + lc.start_time.second
            new_seconds = dt_time.hour * 3600 + dt_time.minute * 60 + dt_time.second
            if abs(lc_seconds - new_seconds) < 10800:
                conflict_time_str = lc.start_time.strftime("%H:%M")
                raise HTTPException(
                    status_code=400,
                    detail=f"Trùng lịch giảng viên: Giảng viên phụ trách đã có lịch dạy lớp {lc.class_id} lúc {conflict_time_str} cùng ngày."
                )

    sched = ClassSchedule(
        class_id=ma_lop_tc.strip(),
        study_date=dt_date,
        room=phong_hoc.strip(),
        start_time=dt_time
    )
    db.add(sched)
    db.commit()
    return {"status": "success", "message": f"Da them lich hoc cho lop {ma_lop_tc} tai phong {phong_hoc}"}

@router.get("/attendance", dependencies=[Depends(get_current_user)])
def get_attendance_history(
    mssv: Optional[str] = Query(None, description="Lọc theo MSSV."),
    ma_lop_tc: Optional[str] = Query(None, description="Lọc theo mã lớp tín chỉ."),
    from_date: Optional[str] = Query(None, description="Từ ngày (YYYY-MM-DD)."),
    to_date: Optional[str] = Query(None, description="Đến ngày (YYYY-MM-DD)."),
    status: Optional[str] = Query(None, description="Lọc theo trạng thái."),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        # Phân quyền: sinh viên chỉ xem log của chính mình
        if current_user.get("role") == "sinh_vien":
            if mssv and mssv.strip().upper() != (current_user.get("mssv") or "").upper():
                raise HTTPException(status_code=403, detail="Sinh viên chỉ xem được log điểm danh của chính mình.")
            mssv = current_user.get("mssv")

        query = db.query(AttendanceHistory)

        if mssv:
            query = query.filter(AttendanceHistory.student_id == mssv.strip().upper())
        if status:
            query = query.filter(AttendanceHistory.status == status.strip())
        if ma_lop_tc:
            query = query.join(ClassSchedule, AttendanceHistory.schedule_id == ClassSchedule.schedule_id)\
                         .filter(ClassSchedule.class_id == ma_lop_tc.strip())
        if from_date:
            query = query.filter(AttendanceHistory.check_in_time >= f"{from_date} 00:00:00")
        if to_date:
            query = query.filter(AttendanceHistory.check_in_time <= f"{to_date} 23:59:59")

        total = query.count()
        rows = query.order_by(AttendanceHistory.check_in_time.desc()).offset(offset).limit(limit).all()
        logs = []
        for r in rows:
            logs.append({
                "id": r.attendance_id,
                "mssv": r.student_id,
                "fullname": r.student.profile.full_name if (r.student and r.student.profile) else "N/A",
                "lop_base": r.student.administrative_class if r.student else "N/A",
                "ma_buoi_hoc": r.schedule_id,
                "timestamp": r.check_in_time.strftime("%Y-%m-%d %H:%M:%S") if r.check_in_time else "N/A",
                "trang_thai": r.status
            })
        return {"logs": logs, "total": total, "offset": offset, "limit": limit}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Loi truy van database: {e}")

@router.get("/registration/info", dependencies=[Depends(get_current_user)])
def get_registration_info(db: Session = Depends(get_db)):
    reg = _get_registration_config()
    demo = get_demo_controls(db)
    open_date = reg.get("open_date")
    close_date = reg.get("close_date")
    is_open = False
    try:
        od = datetime.strptime(open_date, "%Y-%m-%d").date() if open_date else None
        cd = datetime.strptime(close_date, "%Y-%m-%d").date() if close_date else None
        today = datetime.now().date()
        is_open = bool(od and cd and od <= today <= cd)
    except ValueError:
        is_open = False
    return {
        "status": "success",
        "semester": reg.get("semester"),
        "academic_year": reg.get("academic_year"),
        "open_date": open_date,
        "close_date": close_date,
        "is_open": is_open,
        "min_credits": reg.get("min_credits"),
        "max_credits": reg.get("max_credits"),
        "demo_mode": bool(demo.get("demo_mode")),
        "bypass_any": any(k.startswith("bypass_") and bool(demo[k]) for k in demo),
        "message": ("Đang trong đợt đăng ký." if is_open
                    else "Đang ngoài đợt đăng ký học phần.")
    }

@router.get("/lop_tin_chi")
def list_credit_classes(lecturer_id: Optional[str] = None, skip: int = Query(0, ge=0),
                        limit: int = Query(200, ge=1, le=500),
                        db: Session = Depends(get_db),
                        current_user: dict = Depends(get_current_user)):
    try:
        # Giảng viên chỉ được xem đúng lớp của chính mình
        if current_user["role"] == "giang_vien":
            own_id = current_user.get("lecturer_id")
            if not own_id:
                raise HTTPException(status_code=403, detail="Tài khoản giảng viên chưa gắn mã giảng viên.")
            if lecturer_id and lecturer_id.strip() != own_id:
                raise HTTPException(status_code=403, detail="Giảng viên chỉ xem được lớp của chính mình.")
            lecturer_id = own_id
        query = db.query(CreditClass)
        if lecturer_id:
            query = query.filter(CreditClass.lecturer_id == lecturer_id.strip())
        total = query.count()
        classes = query.order_by(CreditClass.class_id).offset(skip).limit(limit).all()
        return {
            "status": "success",
            "total": total,
            "skip": skip,
            "limit": limit,
            "classes": [
                {
                    "class_id": c.class_id,
                    "subject_id": c.subject_id,
                    "subject_name": c.subject.subject_name if c.subject else "N/A",
                    "credits": c.subject.credits if c.subject and c.subject.credits else 0,
                    "lecturer_id": c.lecturer_id,
                    "lecturer_name": c.lecturer.full_name if c.lecturer else "N/A",
                    "semester": c.semester,
                    "academic_year": c.academic_year,
                    "cohort": c.cohort,
                    "current_students": c.current_students or 0,
                    "max_students": c.max_students or 50,
                    "status": c.status or "Active"
                }
                for c in classes
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")

@router.get("/students/{student_id}/classes")
def list_student_classes(student_id: str, db: Session = Depends(get_db),
                         current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "sinh_vien":
        if not current_user.get("mssv") or current_user["mssv"].upper() != student_id.upper():
            raise HTTPException(status_code=403, detail="Sinh viên chỉ xem được danh sách lớp của chính mình.")
    try:
        enrollments = db.query(StudentClassEnrollment).filter(StudentClassEnrollment.student_id == student_id.upper()).all()
        classes = []
        total_credits = 0
        for e in enrollments:
            # Dem so buoi học
            total_sessions = db.query(ClassSchedule).filter(ClassSchedule.class_id == e.class_id).count()
            # Dem so buoi di học cua sinh vien
            attended_sessions = db.query(AttendanceHistory).filter(
                AttendanceHistory.student_id == student_id.upper(),
                AttendanceHistory.schedule_id.in_(
                    db.query(ClassSchedule.schedule_id).filter(ClassSchedule.class_id == e.class_id)
                )
            ).count()

            credits = e.credit_class.subject.credits if (e.credit_class and e.credit_class.subject and e.credit_class.subject.credits) else 0
            total_credits += credits
            classes.append({
                "class_id": e.class_id,
                "subject_id": e.credit_class.subject_id if e.credit_class else "N/A",
                "subject_name": e.credit_class.subject.subject_name if e.credit_class and e.credit_class.subject else "N/A",
                "credits": credits,
                "status": e.academic_status,
                "semester": e.credit_class.semester if e.credit_class else None,
                "total_sessions": total_sessions,
                "attended_sessions": attended_sessions
            })
        return {"status": "success", "classes": classes, "total_credits": total_credits}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")

@router.get("/lich_hoc_chi_tiet", dependencies=[Depends(get_current_user)])
def list_schedules(lecturer_id: Optional[str] = None, class_id: Optional[str] = None, db: Session = Depends(get_db),
                   current_user: dict = Depends(get_current_user)):
    try:
        # Giảng viên chỉ được xem lịch của chính mình
        if current_user["role"] == "giang_vien":
            own_id = current_user.get("lecturer_id")
            if not own_id:
                raise HTTPException(status_code=403, detail="Tài khoản giảng viên chưa gắn mã giảng viên.")
            if lecturer_id and lecturer_id.strip() != own_id:
                raise HTTPException(status_code=403, detail="Giảng viên chỉ xem được lịch của chính mình.")
            lecturer_id = own_id
        query = db.query(ClassSchedule)
        if lecturer_id:
            query = query.join(CreditClass).filter(CreditClass.lecturer_id == lecturer_id.strip())
        if class_id:
            query = query.filter(ClassSchedule.class_id == class_id.strip())
        schedules = query.order_by(ClassSchedule.study_date.desc(), ClassSchedule.start_time.desc()).all()
        return {
            "status": "success",
            "schedules": [
                {
                    "schedule_id": s.schedule_id,
                    "class_id": s.class_id,
                    "study_date": str(s.study_date),
                    "room": s.room,
                    "start_time": str(s.start_time),
                    "subject_name": s.credit_class.subject.subject_name if s.credit_class and s.credit_class.subject else "N/A"
                }
                for s in schedules
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")

@router.put("/lich_hoc_chi_tiet/{schedule_id}", dependencies=[Depends(require_admin)])
def update_schedule(
    schedule_id: int,
    study_date: str = Form(...),
    room: str = Form(...),
    start_time: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        sched = db.query(ClassSchedule).filter(ClassSchedule.schedule_id == schedule_id).first()
        if not sched:
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch học")
            
        dt_date = datetime.strptime(study_date.strip(), "%Y-%m-%d").date()
        
        # Hỗ trợ định dạng cả HH:MM và HH:MM:SS
        time_str = start_time.strip()
        if len(time_str) == 5:
            time_str += ":00"
        dt_time = datetime.strptime(time_str, "%H:%M:%S").time()
        
        # 1. Kiểm tra trùng lịch phòng học (loại trừ chính bản ghi schedule_id này)
        room_conflicts = db.query(ClassSchedule).filter(
            ClassSchedule.room == room.strip(),
            ClassSchedule.study_date == dt_date,
            ClassSchedule.schedule_id != schedule_id
        ).all()
        
        new_seconds = dt_time.hour * 3600 + dt_time.minute * 60 + dt_time.second
        for c in room_conflicts:
            c_seconds = c.start_time.hour * 3600 + c.start_time.minute * 60 + c.start_time.second
            if abs(c_seconds - new_seconds) < 10800:
                conflict_class_id = c.class_id
                conflict_time_str = c.start_time.strftime("%H:%M")
                raise HTTPException(
                    status_code=400, 
                    detail=f"Trùng lịch: Phòng {room.strip()} đã có lớp {conflict_class_id} học lúc {conflict_time_str} cùng ngày."
                )

        # 2. Kiểm tra trùng lịch giảng viên (loại trừ chính bản ghi schedule_id này)
        if sched.credit_class and sched.credit_class.lecturer_id:
            lecturer_conflicts = db.query(ClassSchedule).join(CreditClass).filter(
                CreditClass.lecturer_id == sched.credit_class.lecturer_id,
                ClassSchedule.study_date == dt_date,
                ClassSchedule.schedule_id != schedule_id
            ).all()
            for lc in lecturer_conflicts:
                lc_seconds = lc.start_time.hour * 3600 + lc.start_time.minute * 60 + lc.start_time.second
                if abs(lc_seconds - new_seconds) < 10800:
                    conflict_time_str = lc.start_time.strftime("%H:%M")
                    raise HTTPException(
                        status_code=400,
                        detail=f"Trùng lịch giảng viên: Giảng viên phụ trách đã có lịch dạy lớp {lc.class_id} lúc {conflict_time_str} cùng ngày."
                    )
                    
        sched.study_date = dt_date
        sched.room = room.strip()
        sched.start_time = dt_time
        db.commit()
        return {"status": "success", "message": "Cập nhật lịch học thành công"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")

@router.delete("/lich_hoc_chi_tiet/{schedule_id}", dependencies=[Depends(require_admin)])
def delete_schedule(schedule_id: int, db: Session = Depends(get_db)):
    try:
        sched = db.query(ClassSchedule).filter(ClassSchedule.schedule_id == schedule_id).first()
        if not sched:
            raise HTTPException(status_code=404, detail="Không tìm thấy lịch học")
        db.delete(sched)
        db.commit()
        return {"status": "success", "message": "Xóa lịch học thành công"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")

@router.get("/admin/reports/summary", dependencies=[Depends(require_admin)])
def get_admin_summary_report(db: Session = Depends(get_db)):
    """Báo cáo tổng hợp toàn hệ thống cho Admin: lớp, SV, SV cấm thi..."""
    try:
        from app.core.attendance_report import build_class_report

        classes = db.query(CreditClass).all()
        class_summaries = []
        at_risk = []  # SV có nguy cơ/cấm thi
        total_students = 0
        total_schedules = 0

        for cc in classes:
            data = build_class_report(db, cc.class_id)
            total_schedules += data["total_sessions"]
            students = data["report"]
            total_students += len(students)

            present = sum(s["co_mat"] for s in students)
            late = sum(s["di_muon"] for s in students)
            absent = sum(s["vang_kp"] for s in students)

            banned = [s for s in students if s["trang_thai"] == "Cấm thi"]
            at_risk.extend({
                "mssv": s["mssv"],
                "ho_ten": s["ho_ten"],
                "lop_base": s["lop_base"],
                "ma_lop_tc": cc.class_id,
                "ty_le_vang": s["ty_le_vang"],
                "score": s["score"],
            } for s in banned)

            class_summaries.append({
                "ma_lop_tc": cc.class_id,
                "subject_name": cc.subject.subject_name if cc.subject else "N/A",
                "so_sv": len(students),
                "tong_buoi": data["total_sessions"],
                "co_mat": present,
                "di_muon": late,
                "vang_kp": absent,
                "so_cam_thi": len(banned),
            })

        return {
            "status": "success",
            "tong_lop": len(classes),
            "tong_sv": total_students,
            "tong_buoi_hoc": total_schedules,
            "so_sv_cam_thi": len(at_risk),
            "at_risk": sorted(at_risk, key=lambda x: -x["ty_le_vang"])[:50],
            "classes": class_summaries,
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {err}")


@router.get("/reports/lecturer", dependencies=[Depends(require_roles("giang_vien", "admin"))])
def get_lecturer_report(lecturer_id: Optional[str] = None, db: Session = Depends(get_db),
                        current_user: dict = Depends(get_current_user)):
    """Báo cáo tổng kết cấp giảng viên: tổng hợp tất cả lớp GV phụ trách."""
    try:
        from app.core.attendance_report import build_classes_summary
        # Giảng viên chỉ xem được báo cáo của chính mình
        if current_user.get("role") == "giang_vien":
            own_id = current_user.get("lecturer_id")
            if not own_id:
                raise HTTPException(status_code=403, detail="Tài khoản giảng viên chưa gắn mã giảng viên.")
            if lecturer_id and lecturer_id.strip() != own_id:
                raise HTTPException(status_code=403, detail="Giảng viên chỉ xem được báo cáo của chính mình.")
            lecturer_id = own_id
        query = db.query(CreditClass)
        if lecturer_id:
            query = query.filter(CreditClass.lecturer_id == lecturer_id.strip())
        classes = query.all()
        data = build_classes_summary(db, classes)
        return {"status": "success", "lecturer_id": lecturer_id or "Tất cả", **data}
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {err}")


@router.get("/reports/subject", dependencies=[Depends(require_roles("giang_vien", "admin"))])
def get_subject_report(subject_id: str, db: Session = Depends(get_db)):
    """Báo cáo tổng kết cấp môn học: gộp tất cả lớp cùng môn."""
    try:
        from app.core.attendance_report import build_classes_summary
        sub = db.query(Subject).filter(Subject.subject_id == subject_id.strip().upper()).first()
        if not sub:
            raise HTTPException(status_code=404, detail=f"Không tìm thấy môn học {subject_id}")
        classes = db.query(CreditClass).filter(CreditClass.subject_id == subject_id.strip().upper()).all()
        data = build_classes_summary(db, classes)
        return {"status": "success", "subject_id": sub.subject_id, "subject_name": sub.subject_name, **data}
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {err}")


@router.get("/reports/student", dependencies=[Depends(get_current_user)])
def get_student_report(mssv: Optional[str] = None, db: Session = Depends(get_db),
                       current_user: dict = Depends(get_current_user)):
    """Báo cáo tổng kết cá nhân của sinh viên trên tất cả lớp.

    Phân quyền: SV chỉ xem của mình; GV chỉ xem SV trong lớp mình dạy; Admin mọi SV.
    """
    try:
        from app.core.attendance_report import build_student_summary
        role = current_user.get("role")

        if role == "sinh_vien":
            target = (current_user.get("mssv") or "").strip().upper()
            if mssv and mssv.strip().upper() != target:
                raise HTTPException(status_code=403, detail="Sinh viên chỉ xem được báo cáo của chính mình.")
            if not target:
                raise HTTPException(status_code=400, detail="Tài khoản chưa gắn MSSV.")
        else:
            target = (mssv or "").strip().upper()
            if not target:
                raise HTTPException(status_code=400, detail="Vui lòng nhập MSSV.")

        if role == "giang_vien":
            own = (current_user.get("lecturer_id") or "").strip()
            if not own:
                raise HTTPException(status_code=403, detail="Tài khoản giảng viên chưa gắn mã giảng viên.")
            # GV chỉ xem SV thuộc lớp mình dạy
            taught = db.query(StudentClassEnrollment).join(
                CreditClass, CreditClass.class_id == StudentClassEnrollment.class_id
            ).filter(
                CreditClass.lecturer_id == own,
                StudentClassEnrollment.student_id == target,
            ).first()
            if not taught:
                raise HTTPException(status_code=403, detail="Sinh viên này không thuộc lớp bạn giảng dạy.")

        result = build_student_summary(db, target)
        if result is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên.")
        return {"status": "success", **result}
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {err}")


@router.get("/admin/reports/faculty", dependencies=[Depends(require_admin)])
def get_faculty_report(
    cohort: Optional[str] = Query(None, description="Lọc theo khóa (VD: D22)."),
    administrative_class: Optional[str] = Query(None, description="Lọc theo lớp hành chính."),
    department: Optional[str] = Query(None, description="Lọc theo khoa."),
    db: Session = Depends(get_db),
):
    """Báo cáo tổng kết cấp lớp hành chính / khóa / khoa (chỉ Admin)."""
    try:
        from app.core.attendance_report import build_student_summary
        q = db.query(Student)
        if cohort:
            q = q.filter(Student.cohort == cohort.strip())
        if administrative_class:
            q = q.filter(Student.administrative_class == administrative_class.strip())
        if department:
            q = q.filter(Student.department == department.strip())
        students = q.order_by(Student.student_id).all()

        student_rows = []
        for st in students:
            rep = build_student_summary(db, st.student_id)
            if rep:
                total_vang = rep["totals"]["tong_vang"]
                tong_buoi = rep["totals"]["tong_buoi"]
                ty_le = round((total_vang / tong_buoi) * 100, 1) if tong_buoi else 0.0
                student_rows.append({
                    "mssv": rep["student"]["mssv"],
                    "ho_ten": rep["student"]["ho_ten"],
                    "lop_base": rep["student"]["lop_base"],
                    "cohort": rep["student"]["cohort"],
                    "so_lop": rep["totals"]["so_lop"],
                    "tong_buoi": tong_buoi,
                    "tong_vang": total_vang,
                    "ty_le_vang": ty_le,
                    "cam_thi": rep["cam_thi"],
                })

        at_risk = [s for s in student_rows if s["cam_thi"]]
        return {
            "status": "success",
            "filters": {"cohort": cohort, "administrative_class": administrative_class, "department": department},
            "tong_sv": len(student_rows),
            "so_sv_cam_thi": len(at_risk),
            "students": student_rows,
            "at_risk": at_risk,
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {err}")


@router.get("/reports/lecturer/export", dependencies=[Depends(require_roles("giang_vien", "admin"))])
def export_lecturer_report(lecturer_id: Optional[str] = None, db: Session = Depends(get_db),
                           current_user: dict = Depends(get_current_user)):
    """Xuất Excel báo cáo tổng kết cấp giảng viên."""
    try:
        from app.core.attendance_report import build_classes_summary
        from app.core.excel import build_excel_response
        if current_user.get("role") == "giang_vien":
            own_id = current_user.get("lecturer_id")
            if not own_id:
                raise HTTPException(status_code=403, detail="Tài khoản giảng viên chưa gắn mã giảng viên.")
            if lecturer_id and lecturer_id.strip() != own_id:
                raise HTTPException(status_code=403, detail="Giảng viên chỉ xem được báo cáo của chính mình.")
            lecturer_id = own_id
        query = db.query(CreditClass)
        if lecturer_id:
            query = query.filter(CreditClass.lecturer_id == lecturer_id.strip())
        data = build_classes_summary(db, query.all())
        rows = [{
            "Lớp TC": c["ma_lop_tc"],
            "Môn học": c["subject_name"],
            "Số SV": c["so_sv"],
            "Tổng buổi": c["tong_buoi"],
            "Có mặt": c["co_mat"],
            "Đi muộn": c["di_muon"],
            "Vắng KP": c["vang_kp"],
            "Cấm thi": c["so_cam_thi"],
        } for c in data["classes"]]
        return build_excel_response(f"bao_cao_giang_vien_{lecturer_id or 'tat_ca'}.xlsx", rows,
                                    ["Lớp TC", "Môn học", "Số SV", "Tổng buổi", "Có mặt", "Đi muộn", "Vắng KP", "Cấm thi"])
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {err}")


@router.get("/reports/subject/export", dependencies=[Depends(require_roles("giang_vien", "admin"))])
def export_subject_report(subject_id: str, db: Session = Depends(get_db)):
    """Xuất Excel báo cáo tổng kết cấp môn học."""
    try:
        from app.core.attendance_report import build_classes_summary
        from app.core.excel import build_excel_response
        classes = db.query(CreditClass).filter(CreditClass.subject_id == subject_id.strip().upper()).all()
        data = build_classes_summary(db, classes)
        rows = [{
            "Lớp TC": c["ma_lop_tc"],
            "Giảng viên": c["lecturer_name"],
            "Số SV": c["so_sv"],
            "Tổng buổi": c["tong_buoi"],
            "Có mặt": c["co_mat"],
            "Đi muộn": c["di_muon"],
            "Vắng KP": c["vang_kp"],
            "Cấm thi": c["so_cam_thi"],
        } for c in data["classes"]]
        return build_excel_response(f"bao_cao_mon_hoc_{subject_id.upper()}.xlsx", rows,
                                    ["Lớp TC", "Giảng viên", "Số SV", "Tổng buổi", "Có mặt", "Đi muộn", "Vắng KP", "Cấm thi"])
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {err}")


@router.get("/reports/student/export", dependencies=[Depends(get_current_user)])
def export_student_report(mssv: Optional[str] = None, db: Session = Depends(get_db),
                          current_user: dict = Depends(get_current_user)):
    """Xuất Excel báo cáo cá nhân sinh viên."""
    try:
        from app.core.attendance_report import build_student_summary
        from app.core.excel import build_excel_response
        role = current_user.get("role")
        if role == "sinh_vien":
            target = (current_user.get("mssv") or "").strip().upper()
        else:
            target = (mssv or "").strip().upper()
        if not target:
            raise HTTPException(status_code=400, detail="Vui lòng nhập MSSV.")
        result = build_student_summary(db, target)
        if result is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên.")
        rows = [{
            "Lớp TC": c["ma_lop_tc"],
            "Môn học": c["subject_name"],
            "Giảng viên": c["lecturer_name"],
            "Tổng buổi": c["tong_buoi"],
            "Có mặt": c["co_mat"],
            "Đi muộn": c["di_muon"],
            "Vắng KP": c["vang_kp"],
            "Vắng CP": c["co_phep"],
            "Điểm CC": c["score"],
            "Tỷ lệ vắng (%)": c["ty_le_vang"],
            "Trạng thái": c["trang_thai"],
        } for c in result["classes"]]
        return build_excel_response(f"bao_cao_sinh_vien_{target}.xlsx", rows,
                                    ["Lớp TC", "Môn học", "Giảng viên", "Tổng buổi", "Có mặt", "Đi muộn", "Vắng KP", "Vắng CP", "Điểm CC", "Tỷ lệ vắng (%)", "Trạng thái"])
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {err}")


@router.get("/admin/reports/faculty/export", dependencies=[Depends(require_admin)])
def export_faculty_report(
    cohort: Optional[str] = Query(None),
    administrative_class: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Xuất Excel báo cáo cấp khóa / lớp hành chính / khoa (chỉ Admin)."""
    try:
        from app.core.attendance_report import build_student_summary
        from app.core.excel import build_excel_response
        q = db.query(Student)
        if cohort:
            q = q.filter(Student.cohort == cohort.strip())
        if administrative_class:
            q = q.filter(Student.administrative_class == administrative_class.strip())
        if department:
            q = q.filter(Student.department == department.strip())
        rows = []
        for st in q.order_by(Student.student_id).all():
            rep = build_student_summary(db, st.student_id)
            if not rep:
                continue
            total_vang = rep["totals"]["tong_vang"]
            tong_buoi = rep["totals"]["tong_buoi"]
            ty_le = round((total_vang / tong_buoi) * 100, 1) if tong_buoi else 0.0
            rows.append({
                "MSSV": rep["student"]["mssv"],
                "Họ và Tên": rep["student"]["ho_ten"],
                "Lớp hành chính": rep["student"]["lop_base"],
                "Khóa": rep["student"]["cohort"],
                "Số lớp": rep["totals"]["so_lop"],
                "Tổng buổi": tong_buoi,
                "Vắng": total_vang,
                "Tỷ lệ vắng (%)": ty_le,
                "Trạng thái": "Cấm thi" if rep["cam_thi"] else "Hợp lệ",
            })
        return build_excel_response(f"bao_cao_khoa_{cohort or administrative_class or department or 'tat_ca'}.xlsx", rows,
                                    ["MSSV", "Họ và Tên", "Lớp hành chính", "Khóa", "Số lớp", "Tổng buổi", "Vắng", "Tỷ lệ vắng (%)", "Trạng thái"])
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {err}")


@router.get("/reports/attendance", dependencies=[Depends(require_roles("giang_vien", "admin"))])
def get_class_attendance_report(
    ma_lop_tc: str,
    from_date: Optional[str] = Query(None, description="Lọc từ ngày (YYYY-MM-DD)."),
    to_date: Optional[str] = Query(None, description="Lọc đến ngày (YYYY-MM-DD)."),
    db: Session = Depends(get_db)
):
    try:
        from app.core.attendance_report import build_class_report
        data = build_class_report(db, ma_lop_tc, from_date=from_date, to_date=to_date)
        return {"status": "success", **data}
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {err}")

@router.get("/reports/attendance/export", dependencies=[Depends(require_roles("giang_vien", "admin"))])
def export_class_attendance_report(
    ma_lop_tc: str,
    from_date: Optional[str] = Query(None, description="Lọc từ ngày (YYYY-MM-DD)."),
    to_date: Optional[str] = Query(None, description="Lọc đến ngày (YYYY-MM-DD)."),
    db: Session = Depends(get_db)
):
    try:
        from fastapi.responses import StreamingResponse
        import pandas as pd
        import io
        from app.core.attendance_report import build_class_report

        data = build_class_report(db, ma_lop_tc, from_date=from_date, to_date=to_date)
        report_data = [{
            "MSSV": r["mssv"],
            "Họ và Tên": r["ho_ten"],
            "Lớp hành chính": r["lop_base"],
            "Tổng buổi": r["tong_buoi"],
            "Có mặt": r["co_mat"],
            "Đi muộn": r["di_muon"],
            "Vắng không phép": r["vang_kp"],
            "Vắng có phép": r["co_phep"],
            "Chờ duyệt": r["cho_duyet"],
            "Điểm chuyên cần": r["score"],
            "Tỷ lệ vắng (%)": r["ty_le_vang"],
            "Trạng thái": r["trang_thai"],
        } for r in data["report"]]

        df = pd.DataFrame(report_data)
        stream = io.BytesIO()
        with pd.ExcelWriter(stream, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name="BaoCaoTongKet")
        stream.seek(0)
        
        filename = f"bao_cao_tong_ket_{ma_lop_tc.strip()}.xlsx"
        return StreamingResponse(
            stream, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống khi xuất báo cáo: {err}")

@router.delete("/attendance/{attendance_id}", dependencies=[Depends(require_roles("giang_vien", "admin"))])
def delete_attendance_record(attendance_id: int, db: Session = Depends(get_db),
                             current_user: dict = Depends(get_current_user)):
    """Xóa bản ghi điểm danh (dùng để sửa sai khi bấm nhầm)."""
    att = db.query(AttendanceHistory).filter(AttendanceHistory.attendance_id == attendance_id).first()
    if not att:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi điểm danh.")
    db.delete(att)
    db.commit()
    log_audit(db, actor_username=current_user.get("username"), actor_role=current_user.get("role"),
              action="DELETE", target="attendance", target_id=str(attendance_id),
              detail=f"Xóa bản ghi điểm danh (SV {att.student_id}, buổi {att.schedule_id})")
    return {"status": "success", "message": "Đã xóa bản ghi điểm danh."}


@router.post("/teacher/manual_checkin", dependencies=[Depends(require_roles("giang_vien", "admin"))])
def teacher_manual_checkin(
    mssv: str = Form(...),
    ma_buoi_hoc: int = Form(...),
    trang_thai: str = Form(...),
    nguoi_xac_nhan: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    try:
        sched = db.query(ClassSchedule).filter(ClassSchedule.schedule_id == ma_buoi_hoc).first()
        if not sched:
            raise HTTPException(status_code=404, detail="Không tìm thấy buổi học.")
            
        student = db.query(Student).filter(Student.student_id == mssv.strip().upper()).first()
        if not student:
            raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên.")

        # Ràng buộc: SV phải thuộc lớp của buổi học mới được điểm danh
        enrolled = db.query(StudentClassEnrollment).filter(
            StudentClassEnrollment.class_id == sched.class_id,
            StudentClassEnrollment.student_id == mssv.strip().upper()
        ).first()
        if not enrolled:
            raise HTTPException(status_code=400,
                                detail=f"Sinh viên {mssv.strip().upper()} không thuộc lớp {sched.class_id} của buổi học này.")

        existing = db.query(AttendanceHistory).filter(
            AttendanceHistory.student_id == mssv.strip().upper(),
            AttendanceHistory.schedule_id == ma_buoi_hoc
        ).first()

        if existing:
            existing.status = trang_thai
            existing.confirmed_by = nguoi_xac_nhan or "Giảng viên"
            existing.check_in_time = datetime.now()
        else:
            new_att = AttendanceHistory(
                student_id=mssv.strip().upper(),
                schedule_id=ma_buoi_hoc,
                status=trang_thai,
                confirmed_by=nguoi_xac_nhan or "Giảng viên",
                check_in_time=datetime.now()
            )
            db.add(new_att)
            
        db.commit()
        try:
            from app.models.account import Account
            from app.core.notify import notify
            acc = db.query(Account).filter(Account.username == mssv.strip().upper().lower()).first()
            if acc:
                notify(db, acc.username,
                       f"Đã cập nhật điểm danh: {trang_thai}",
                       f"Buổi học số {ma_buoi_hoc} (bởi {nguoi_xac_nhan or 'Giảng viên'}).",
                       ntype="info")
        except Exception:
            pass
        return {"status": "success", "message": f"Cập nhật trạng thái điểm danh cho {mssv} thành công."}
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")

@router.post("/student/leave_request")
def student_leave_request(
    mssv: str = Form(...),
    ma_buoi_hoc: int = Form(...),
    ly_do: str = Form(...),
    minh_chung: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    try:
        # Sinh viên chỉ được nộp đơn cho buổi học của chính mình
        if current_user["role"] == "sinh_vien":
            if not current_user.get("mssv") or current_user["mssv"].upper() != mssv.strip().upper():
                raise HTTPException(status_code=403, detail="Sinh viên không thể xin nghỉ hộ người khác.")
        student = db.query(Student).filter(Student.student_id == mssv.strip().upper()).first()
        if not student:
            raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên.")

        sched = db.query(ClassSchedule).filter(ClassSchedule.schedule_id == ma_buoi_hoc).first()
        if not sched:
            raise HTTPException(status_code=404, detail="Không tìm thấy buổi học.")

        # Ràng buộc: SV chỉ xin nghỉ cho lớp mình đang học
        enrolled = db.query(StudentClassEnrollment).filter(
            StudentClassEnrollment.class_id == sched.class_id,
            StudentClassEnrollment.student_id == mssv.strip().upper()
        ).first()
        if not enrolled:
            raise HTTPException(status_code=400,
                                detail=f"Sinh viên {mssv.strip().upper()} không thuộc lớp {sched.class_id} của buổi học này.")

        # Chặn nộp đơn nghỉ khi buổi học đã bắt đầu (phải xin TRƯỚC giờ học)
        demo = get_demo_controls(db)
        if not demo.get("allow_after_hours_leave"):
            try:
                clean_time = str(sched.start_time).strip()
                if len(clean_time) == 5:
                    clean_time += ":00"
                start_dt = datetime.strptime(f"{sched.study_date} {clean_time}", "%Y-%m-%d %H:%M:%S")
            except Exception:
                start_dt = datetime.combine(sched.study_date, sched.start_time)
            if datetime.now() >= start_dt:
                raise HTTPException(status_code=400,
                                    detail="Không thể nộp đơn nghỉ: buổi học đã bắt đầu. Đơn nghỉ phải được nộp trước giờ học.")

        from app.models.leave_request import LeaveRequest
        new_req = LeaveRequest(
            student_id=mssv.strip().upper(),
            schedule_id=ma_buoi_hoc,
            reason=ly_do,
            evidence=minh_chung,
            status="Pending"
        )
        db.add(new_req)
        db.commit()
        return {"status": "success", "message": "Nộp đơn xin nghỉ phép thành công."}
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")

@router.get("/student/leave_requests")
def get_my_leave_requests(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """Danh sách đơn xin nghỉ phép của sinh viên đang đăng nhập (kèm trạng thái duyệt)."""
    from app.models.leave_request import LeaveRequest
    if current_user.get("role") == "sinh_vien":
        mssv = current_user.get("mssv")
        if not mssv:
            return {"status": "success", "requests": []}
        query = db.query(LeaveRequest).filter(LeaveRequest.student_id == mssv.strip().upper())
    else:
        query = db.query(LeaveRequest)
    requests = query.order_by(LeaveRequest.request_id.desc()).limit(100).all()
    return {
        "status": "success",
        "requests": [
            {
                "id": r.request_id,
                "mssv": r.student_id,
                "ho_ten": r.student.profile.full_name if (r.student and r.student.profile) else "N/A",
                "ma_lop_tc": r.schedule.class_id if r.schedule else "N/A",
                "ngay_hoc": str(r.schedule.study_date) if r.schedule else "N/A",
                "ly_do": r.reason,
                "trang_thai": r.status,
                "nguoi_duyet": r.approved_by,
            }
            for r in requests
        ],
    }

@router.get("/teacher/leave_requests", dependencies=[Depends(require_roles("giang_vien", "admin"))])
def get_teacher_leave_requests(lecturer_id: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        from app.models.leave_request import LeaveRequest
        query = db.query(LeaveRequest).join(ClassSchedule).join(CreditClass)
        if lecturer_id:
            query = query.filter(CreditClass.lecturer_id == lecturer_id.strip())
        requests = query.order_by(LeaveRequest.request_id.desc()).all()
        return {
            "status": "success",
            "requests": [
                {
                    "id": r.request_id,
                    "mssv": r.student_id,
                    "ho_ten": r.student.profile.full_name if (r.student and r.student.profile) else "N/A",
                    "ma_lop_tc": r.schedule.class_id if r.schedule else "N/A",
                    "ngay_hoc": str(r.schedule.study_date) if r.schedule else "N/A",
                    "ly_do": r.reason,
                    "minh_chung": r.evidence,
                    "trang_thai": r.status,
                    "nguoi_duyet": r.approved_by
                }
                for r in requests
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")

@router.post("/teacher/approve_leave", dependencies=[Depends(require_roles("giang_vien", "admin"))])
def approve_leave(
    request_id: int = Form(...),
    nguoi_duyet: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    try:
        from app.models.leave_request import LeaveRequest
        req = db.query(LeaveRequest).filter(LeaveRequest.request_id == request_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn xin nghỉ phép.")
        
        req.status = "Approved"
        req.approved_by = nguoi_duyet or "Giảng viên"
        
        existing = db.query(AttendanceHistory).filter(
            AttendanceHistory.student_id == req.student_id,
            AttendanceHistory.schedule_id == req.schedule_id
        ).first()
        
        demo = get_demo_controls(db)
        override_ok = demo.get("allow_override_present_leave", False)
        from app.core.attendance_report import is_present_status

        if existing and is_present_status(existing.status) and not override_ok:
            # Đã có mặt -> giữ nguyên, không ghi đè thành "Có phép" làm giảm điểm oan
            db.commit()
            return {"status": "success", "message": "Đơn đã duyệt. Sinh viên đã có mặt buổi này nên không thay đổi trạng thái điểm danh."}
        elif existing:
            existing.status = "Có phép"
            existing.confirmed_by = nguoi_duyet or "Giảng viên"
        else:
            new_att = AttendanceHistory(
                student_id=req.student_id,
                schedule_id=req.schedule_id,
                status="Có phép",
                confirmed_by=nguoi_duyet or "Giảng viên",
                check_in_time=datetime.now()
            )
            db.add(new_att)
            
        db.commit()
        return {"status": "success", "message": "Đã duyệt đơn nghỉ phép có phép thành công."}
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")

@router.post("/teacher/reject_leave", dependencies=[Depends(require_roles("giang_vien", "admin"))])
def reject_leave(
    request_id: int = Form(...),
    nguoi_duyet: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    try:
        from app.models.leave_request import LeaveRequest
        req = db.query(LeaveRequest).filter(LeaveRequest.request_id == request_id).first()
        if not req:
            raise HTTPException(status_code=404, detail="Không tìm thấy đơn xin nghỉ phép.")
        
        req.status = "Rejected"
        req.approved_by = nguoi_duyet or "Giảng viên"
        
        existing = db.query(AttendanceHistory).filter(
            AttendanceHistory.student_id == req.student_id,
            AttendanceHistory.schedule_id == req.schedule_id
        ).first()

        from app.core.attendance_report import is_present_status
        if existing and is_present_status(existing.status):
            # SV đã có mặt -> từ chối đơn không làm hạ điểm
            db.commit()
            return {"status": "success", "message": "Đã từ chối đơn. Sinh viên đã có mặt buổi này nên không thay đổi điểm danh."}
        elif existing:
            existing.status = "Vắng không phép"
            existing.confirmed_by = nguoi_duyet or "Giảng viên"
        else:
            new_att = AttendanceHistory(
                student_id=req.student_id,
                schedule_id=req.schedule_id,
                status="Vắng không phép",
                confirmed_by=nguoi_duyet or "Giảng viên",
                check_in_time=datetime.now()
            )
            db.add(new_att)
            
        db.commit()
        return {"status": "success", "message": "Đã từ chối đơn nghỉ phép."}
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")


