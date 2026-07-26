from fastapi import APIRouter, Depends, HTTPException, Form
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

router = APIRouter()

@router.post("/mon_hoc")
def add_subject(ma_mon: str = Form(...), ten_mon: str = Form(...), credits: int = Form(3), db: Session = Depends(get_db)):
    existing = db.query(Subject).filter(Subject.subject_id == ma_mon.strip().upper()).first()
    if existing:
        return {"status": "success", "message": f"Mon hoc da ton tai: {ten_mon} ({ma_mon})"}
    
    new_sub = Subject(subject_id=ma_mon.strip().upper(), subject_name=ten_mon.strip(), credits=credits)
    db.add(new_sub)
    db.commit()
    return {"status": "success", "message": f"Da them mon hoc: {ten_mon} ({ma_mon})"}

@router.post("/lop_tin_chi")
def add_credit_class(
    ma_lop_tc: str = Form(...), 
    ma_mon: str = Form(...), 
    ma_gv: Optional[str] = Form(None), 
    db: Session = Depends(get_db)
):
    sub = db.query(Subject).filter(Subject.subject_id == ma_mon.strip().upper()).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Khong tim thay mon hoc {ma_mon}")
        
    existing = db.query(CreditClass).filter(CreditClass.class_id == ma_lop_tc.strip()).first()
    if existing:
        if ma_gv:
            existing.lecturer_id = ma_gv.strip()
            db.commit()
        return {"status": "success", "message": f"Da them lop tin chi: {ma_lop_tc}"}

    new_cc = CreditClass(
        class_id=ma_lop_tc.strip(), 
        subject_id=ma_mon.strip().upper(),
        lecturer_id=ma_gv.strip() if ma_gv else None
    )
    db.add(new_cc)
    db.commit()
    return {"status": "success", "message": f"Da them lop tin chi: {ma_lop_tc}"}


@router.post("/sinh_vien_lop_tin_chi")
def enroll_student(ma_lop_tc: str = Form(...), mssv: str = Form(...), db: Session = Depends(get_db)):
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
        student_id=mssv.strip().upper()
    )
    db.add(enroll)
    db.commit()
    return {"status": "success", "message": f"Da dang ky sinh vien {mssv} vao lop {ma_lop_tc}"}


@router.delete("/sinh_vien_lop_tin_chi/{ma_lop_tc}/{mssv}")
def unenroll_student(ma_lop_tc: str, mssv: str, db: Session = Depends(get_db)):
    enrollment = db.query(StudentClassEnrollment).filter(
        StudentClassEnrollment.class_id == ma_lop_tc.strip(),
        StudentClassEnrollment.student_id == mssv.strip().upper()
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin đăng ký học của sinh viên này.")
    
    db.delete(enrollment)
    db.commit()
    return {"status": "success", "message": f"Đã hủy đăng ký lớp {ma_lop_tc} thành công."}

@router.post("/sinh_vien_lop_tin_chi/bulk_administrative")
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
    for st in students:
        existing = db.query(StudentClassEnrollment).filter(
            StudentClassEnrollment.class_id == ma_lop_tc.strip(),
            StudentClassEnrollment.student_id == st.student_id
        ).first()
        
        if not existing:
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
                student_id=st.student_id
            )
            db.add(enroll)
            count += 1
            
    db.commit()
    msg = f"Đã đăng ký thành công {count} sinh viên của lớp {lop_hanh_chinh} vào lớp tín chỉ {ma_lop_tc}."
    if skipped_conflict > 0:
        msg += f" (Bỏ qua {skipped_conflict} sinh viên do bị trùng lịch học)."
    return {
        "status": "success",
        "message": msg
    }

@router.post("/lich_hoc_chi_tiet")
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

    sched = ClassSchedule(
        class_id=ma_lop_tc.strip(),
        study_date=dt_date,
        room=phong_hoc.strip(),
        start_time=dt_time
    )
    db.add(sched)
    db.commit()
    return {"status": "success", "message": f"Da them lich hoc cho lop {ma_lop_tc} tai phong {phong_hoc}"}

@router.get("/attendance")
def get_attendance_history(db: Session = Depends(get_db)):
    try:
        rows = db.query(AttendanceHistory).order_by(AttendanceHistory.check_in_time.desc()).limit(100).all()
        logs = []
        for r in rows:
            logs.append({
                "id": r.attendance_id,
                "mssv": r.student_id,
                "fullname": r.student.full_name if r.student else "N/A",
                "lop_base": r.student.administrative_class if r.student else "N/A",
                "ma_buoi_hoc": r.schedule_id,
                "timestamp": r.check_in_time.strftime("%Y-%m-%d %H:%M:%S") if r.check_in_time else "N/A",
                "trang_thai": r.status
            })
        return {"logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Loi truy van database: {e}")

@router.get("/lop_tin_chi")
def list_credit_classes(lecturer_id: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        query = db.query(CreditClass)
        if lecturer_id:
            query = query.filter(CreditClass.lecturer_id == lecturer_id.strip())
        classes = query.all()
        return {
            "status": "success",
            "classes": [
                {
                    "class_id": c.class_id,
                    "subject_id": c.subject_id,
                    "subject_name": c.subject.subject_name if c.subject else "N/A",
                    "lecturer_id": c.lecturer_id,
                    "lecturer_name": c.lecturer.full_name if c.lecturer else "N/A"
                }
                for c in classes
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")

@router.get("/students/{student_id}/classes")
def list_student_classes(student_id: str, db: Session = Depends(get_db)):
    try:
        enrollments = db.query(StudentClassEnrollment).filter(StudentClassEnrollment.student_id == student_id.upper()).all()
        classes = []
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
            
            classes.append({
                "class_id": e.class_id,
                "subject_id": e.credit_class.subject_id if e.credit_class else "N/A",
                "subject_name": e.credit_class.subject.subject_name if e.credit_class and e.credit_class.subject else "N/A",
                "status": e.academic_status,
                "total_sessions": total_sessions,
                "attended_sessions": attended_sessions
            })
        return {"status": "success", "classes": classes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")

@router.get("/lich_hoc_chi_tiet")
def list_schedules(lecturer_id: Optional[str] = None, db: Session = Depends(get_db)):
    try:
        query = db.query(ClassSchedule)
        if lecturer_id:
            query = query.join(CreditClass).filter(CreditClass.lecturer_id == lecturer_id.strip())
        schedules = query.all()
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

@router.put("/lich_hoc_chi_tiet/{schedule_id}")
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
        sched.study_date = datetime.strptime(study_date, "%Y-%m-%d").date()
        sched.room = room
        # support both HH:MM and HH:MM:SS formats
        time_parts = [int(p) for p in start_time.split(":")]
        if len(time_parts) >= 2:
            sched.start_time = datetime.strptime(start_time[:5], "%H:%M").time()
        db.commit()
        return {"status": "success", "message": "Cập nhật lịch học thành công"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")

@router.delete("/lich_hoc_chi_tiet/{schedule_id}")
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

@router.get("/reports/attendance")
def get_class_attendance_report(ma_lop_tc: str, db: Session = Depends(get_db)):
    try:
        # Lấy tất cả lịch học của lớp này
        schedules = db.query(ClassSchedule).filter(ClassSchedule.class_id == ma_lop_tc.strip()).all()
        schedule_ids = [s.schedule_id for s in schedules]
        total_sessions = len(schedules)
        
        # Lấy tất cả sinh viên đăng ký lớp này
        enrollments = db.query(StudentClassEnrollment).filter(StudentClassEnrollment.class_id == ma_lop_tc.strip()).all()
        report = []
        for e in enrollments:
            student = e.student
            if not student:
                continue
                
            di_muon = 0
            vang_kp = 0
            co_phep = 0
            
            if total_sessions > 0:
                attendance_records = db.query(AttendanceHistory).filter(
                    AttendanceHistory.student_id == student.student_id,
                    AttendanceHistory.schedule_id.in_(schedule_ids)
                ).all()
                
                attended_schedule_ids = set()
                for record in attendance_records:
                    attended_schedule_ids.add(record.schedule_id)
                    if record.status == "Đi muộn":
                        di_muon += 1
                    elif record.status == "Có phép":
                        co_phep += 1
                    elif record.status in ["Vắng không phép", "Vắng"]:
                        vang_kp += 1
                
                # Check for schedules that have passed but have no attendance history
                now = datetime.now()
                for s in schedules:
                    try:
                        clean_time = str(s.start_time).strip()
                        if len(clean_time) == 5:
                            clean_time += ":00"
                        start_datetime = datetime.strptime(f"{s.study_date} {clean_time}", "%Y-%m-%d %H:%M:%S")
                    except Exception:
                        start_datetime = datetime.combine(s.study_date, s.start_time)
                        
                    if start_datetime < now and s.schedule_id not in attended_schedule_ids:
                        vang_kp += 1
            
            # Điểm chuyên cần: bắt đầu từ 10.0, trừ 0.5 cho đi muộn, trừ 1.0 cho vắng không phép
            score = 10.0 - (di_muon * 0.5) - (vang_kp * 1.0)
            score = max(0.0, round(score, 1))
            
            # Tỷ lệ vắng: (tổng số buổi vắng / tổng số buổi) * 100
            total_absent = vang_kp + co_phep
            ty_le_vang = round((total_absent / total_sessions) * 100, 1) if total_sessions > 0 else 0.0
            
            # Cấm thi nếu tỷ lệ vắng > 20%
            trang_thai = "Cam thi" if ty_le_vang > 20.0 else "Hop le"
            
            report.append({
                "mssv": student.student_id,
                "ho_ten": student.full_name,
                "lop_base": student.administrative_class or "N/A",
                "di_muon": di_muon,
                "vang_kp": vang_kp,
                "co_phep": co_phep,
                "score": score,
                "ty_le_vang": ty_le_vang,
                "trang_thai": trang_thai
            })
            
        return {"status": "success", "report": report}
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {err}")

@router.get("/reports/attendance/export")
def export_class_attendance_report(ma_lop_tc: str, db: Session = Depends(get_db)):
    try:
        from fastapi.responses import StreamingResponse
        import pandas as pd
        import io

        # Lấy tất cả lịch học của lớp này
        schedules = db.query(ClassSchedule).filter(ClassSchedule.class_id == ma_lop_tc.strip()).all()
        schedule_ids = [s.schedule_id for s in schedules]
        total_sessions = len(schedules)
        
        # Lấy tất cả sinh viên đăng ký lớp này
        enrollments = db.query(StudentClassEnrollment).filter(StudentClassEnrollment.class_id == ma_lop_tc.strip()).all()
        report_data = []
        for e in enrollments:
            student = e.student
            if not student:
                continue
                
            di_muon = 0
            vang_kp = 0
            co_phep = 0
            
            if total_sessions > 0:
                attendance_records = db.query(AttendanceHistory).filter(
                    AttendanceHistory.student_id == student.student_id,
                    AttendanceHistory.schedule_id.in_(schedule_ids)
                ).all()
                
                attended_schedule_ids = set()
                for record in attendance_records:
                    attended_schedule_ids.add(record.schedule_id)
                    if record.status == "Đi muộn":
                        di_muon += 1
                    elif record.status == "Có phép":
                        co_phep += 1
                    elif record.status in ["Vắng không phép", "Vắng"]:
                        vang_kp += 1
                
                # Check for schedules that have passed but have no attendance history
                now = datetime.now()
                for s in schedules:
                    try:
                        clean_time = str(s.start_time).strip()
                        if len(clean_time) == 5:
                            clean_time += ":00"
                        start_datetime = datetime.strptime(f"{s.study_date} {clean_time}", "%Y-%m-%d %H:%M:%S")
                    except Exception:
                        start_datetime = datetime.combine(s.study_date, s.start_time)
                        
                    if start_datetime < now and s.schedule_id not in attended_schedule_ids:
                        vang_kp += 1
            
            # Điểm chuyên cần: bắt đầu từ 10.0, trừ 0.5 cho đi muộn, trừ 1.0 cho vắng không phép
            score = 10.0 - (di_muon * 0.5) - (vang_kp * 1.0)
            score = max(0.0, round(score, 1))
            
            # Tỷ lệ vắng: (tổng số buổi vắng / tổng số buổi) * 100
            total_absent = vang_kp + co_phep
            ty_le_vang = round((total_absent / total_sessions) * 100, 1) if total_sessions > 0 else 0.0
            
            # Cấm thi nếu tỷ lệ vắng > 20%
            trang_thai = "Cấm thi" if ty_le_vang > 20.0 else "Hợp lệ"
            
            report_data.append({
                "MSSV": student.student_id,
                "Họ và Tên": student.full_name,
                "Lớp hành chính": student.administrative_class or "N/A",
                "Đi muộn": di_muon,
                "Vắng không phép": vang_kp,
                "Vắng có phép": co_phep,
                "Điểm chuyên cần": score,
                "Tỷ lệ vắng (%)": ty_le_vang,
                "Trạng thái": trang_thai
            })
            
        # Tạo DataFrame và xuất Excel
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

@router.post("/teacher/manual_checkin")
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
    db: Session = Depends(get_db)
):
    try:
        student = db.query(Student).filter(Student.student_id == mssv.strip().upper()).first()
        if not student:
            raise HTTPException(status_code=404, detail="Không tìm thấy sinh viên.")

        sched = db.query(ClassSchedule).filter(ClassSchedule.schedule_id == ma_buoi_hoc).first()
        if not sched:
            raise HTTPException(status_code=404, detail="Không tìm thấy buổi học.")

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

@router.get("/teacher/leave_requests")
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
                    "ho_ten": r.student.full_name if r.student else "N/A",
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

@router.post("/teacher/approve_leave")
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
        
        if existing:
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

@router.post("/teacher/reject_leave")
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
        
        if existing:
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


