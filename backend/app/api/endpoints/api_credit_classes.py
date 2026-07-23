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
def add_credit_class(ma_lop_tc: str = Form(...), ma_mon: str = Form(...), db: Session = Depends(get_db)):
    sub = db.query(Subject).filter(Subject.subject_id == ma_mon.strip().upper()).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Khong tim thay mon hoc {ma_mon}")
        
    existing = db.query(CreditClass).filter(CreditClass.class_id == ma_lop_tc.strip()).first()
    if existing:
        return {"status": "success", "message": f"Da them lop tin chi: {ma_lop_tc}"}

    new_cc = CreditClass(class_id=ma_lop_tc.strip(), subject_id=ma_mon.strip().upper())
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
    
    count = 0
    for st in students:
        existing = db.query(StudentClassEnrollment).filter(
            StudentClassEnrollment.class_id == ma_lop_tc.strip(),
            StudentClassEnrollment.student_id == st.student_id
        ).first()
        
        if not existing:
            enroll = StudentClassEnrollment(
                class_id=ma_lop_tc.strip(),
                student_id=st.student_id
            )
            db.add(enroll)
            count += 1
            
    db.commit()
    return {
        "status": "success",
        "message": f"Đã đăng ký thành công {count} sinh viên của lớp {lop_hanh_chinh} vào lớp tín chỉ {ma_lop_tc}"
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
def list_credit_classes(db: Session = Depends(get_db)):
    try:
        classes = db.query(CreditClass).all()
        return {
            "status": "success",
            "classes": [
                {
                    "class_id": c.class_id,
                    "subject_id": c.subject_id,
                    "subject_name": c.subject.subject_name if c.subject else "N/A"
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
def list_schedules(db: Session = Depends(get_db)):
    try:
        schedules = db.query(ClassSchedule).all()
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
        # Get all enrollments for this class
        enrollments = db.query(StudentClassEnrollment).filter(StudentClassEnrollment.class_id == ma_lop_tc).all()
        report = []
        for e in enrollments:
            student = e.student
            report.append({
                "mssv": e.student_id,
                "ho_ten": student.full_name if student else "N/A",
                "lop_base": student.administrative_class if student else "N/A"
            })
        return {"status": "success", "report": report}
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {err}")

