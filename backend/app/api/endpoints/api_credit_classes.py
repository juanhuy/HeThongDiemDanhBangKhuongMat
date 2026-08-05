from fastapi import APIRouter, Depends, HTTPException, Form, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
from typing import Optional, List
import math
import uuid

from app.db.session import get_db
from app.schemas.credit_class import CreditClassCreate, CreditClassUpdate, CreditClassResponse, AutoGenerateRequest, SaveDraftRequest
from app.models import (
    Subject, CreditClass, ClassEnrollment, ClassSession,
    ClassSchedule, AttendanceRecord, Student, Lecturer, ExpectedClassMapping
)
from app.models.administrative_class import AdministrativeClass
from app.models.semester import Semester
from app.models.classroom import Classroom

router = APIRouter()

def format_class_group(c: CreditClass) -> str:
    if c.sub_group_number is not None:
        return f"{c.sub_group_number:02d}"
    if c.group_number is not None:
        return f"{c.group_number:02d}"
    return ""


# =========================================================================
# API TÍNH TOÁN VÀ TRẢ VỀ BẢN PREVIEW CHO ADMIN
# =========================================================================
@router.post("/credit-classes/preview-groups")
def preview_auto_generate_classes(req: AutoGenerateRequest):
    num_theory_groups = math.ceil(req.total_students / req.max_theory_capacity)
    students_per_theory = req.total_students // num_theory_groups
    remainder_theory = req.total_students % num_theory_groups

    preview_result = []

    for i in range(num_theory_groups):
        t_students = students_per_theory + (1 if i < remainder_theory else 0)
        theory_draft = {
            "class_group": f"{i+1:02d}",
            "max_students": t_students,
            "class_type": "Theory",
            "sub_groups": []
        }

        num_practice_groups = math.ceil(t_students / req.max_practice_capacity)
        students_per_practice = t_students // num_practice_groups
        remainder_practice = t_students % num_practice_groups

        for j in range(num_practice_groups):
            p_students = students_per_practice + (1 if j < remainder_practice else 0)
            theory_draft["sub_groups"].append({
                "class_group": f"Tổ {j+1}",
                "max_students": p_students,
                "class_type": "Practice"
            })
            
        preview_result.append(theory_draft)

    return {
        "status": "success",
        "message": f"Dự kiến tạo {num_theory_groups} Nhóm LT và tổng cộng {sum(len(g['sub_groups']) for g in preview_result)} Tổ TH.",
        "data": preview_result
    }

# =========================================================================
# API NHẬN BẢN PREVIEW ĐÃ CHỈNH SỬA TỪ ADMIN VÀ LƯU VÀO DB (TẠO HÀNG LOẠT)
# =========================================================================
@router.post("/credit-classes/batch")
def save_generated_classes(req: SaveDraftRequest, db: Session = Depends(get_db)):
    saved_classes = []

    for t_group in req.groups:
        t_grp = 1
        if t_group.class_group and str(t_group.class_group).isdigit():
            t_grp = int(t_group.class_group)

        t_id = f"{req.subject_id.strip()}_{req.semester_id.replace('-', '').replace('_', '')}_N{t_grp:02d}"
        
        new_theory = CreditClass(
            class_id=t_id,
            subject_id=req.subject_id,
            lecturer_id=req.lecturer_id,
            semester_id=req.semester_id,
            class_type="Theory" if t_group.sub_groups else "Combined",
            group_number=t_grp,
            sub_group_number=None,
            max_students=t_group.max_students,
            status="Planning"
        )
        db.add(new_theory)
        db.flush() 
        saved_classes.append(t_id)

        # Map lớp biên chế cho Nhóm LT (Đã có sẵn)
        if hasattr(t_group, 'target_classes') and t_group.target_classes:
            for admin_class_id in t_group.target_classes:
                db.add(ExpectedClassMapping(credit_class_id=t_id, admin_class_id=admin_class_id))

        # --- VÒNG LẶP TẠO TỔ THỰC HÀNH ---
        for j, p_group in enumerate(t_group.sub_groups):
            p_grp = int(p_group.class_group) if (p_group.class_group and str(p_group.class_group).isdigit()) else (j + 1)
            p_id = f"{t_id}_T{p_grp:02d}"
            
            new_practice = CreditClass(
                class_id=p_id,
                parent_class_id=t_id,
                subject_id=req.subject_id,
                lecturer_id=req.lecturer_id,
                semester_id=req.semester_id,
                class_type="Practice",
                group_number=t_grp,
                sub_group_number=p_grp,
                max_students=p_group.max_students,
                status="Planning"
            )
            db.add(new_practice)
            saved_classes.append(p_id)

            # 🟢 MỚI: BỔ SUNG MAPPING LỚP BIÊN CHẾ CHO TỔ THỰC HÀNH (p_id)
            if hasattr(t_group, 'target_classes') and t_group.target_classes:
                for admin_class_id in t_group.target_classes:
                    db.add(ExpectedClassMapping(credit_class_id=p_id, admin_class_id=admin_class_id))

    db.commit()
    return {"status": "success", "message": "Thành công", "saved_ids": saved_classes}


# =========================================================================
# QUẢN LÝ LỚP TÍN CHỈ (TẠO LẺ)
# =========================================================================
@router.post("/credit-classes", status_code=status.HTTP_201_CREATED)
def add_credit_class(data: CreditClassCreate, db: Session = Depends(get_db)):
    if not db.query(Subject).filter(Subject.subject_id == data.subject_id.strip()).first():
        raise HTTPException(status_code=404, detail=f"Không tìm thấy môn học: {data.subject_id}")
        
    if data.lecturer_id:
        if not db.query(Lecturer).filter(Lecturer.lecturer_id == data.lecturer_id.strip()).first():
            raise HTTPException(status_code=404, detail=f"Không tìm thấy giảng viên: {data.lecturer_id}")

    if data.class_id:
        generated_class_id = data.class_id.strip()
        if db.query(CreditClass).filter(CreditClass.class_id == generated_class_id).first():
            raise HTTPException(status_code=400, detail=f"Mã lớp tín chỉ '{generated_class_id}' đã tồn tại trên hệ thống.")
    else:
        random_suffix = str(uuid.uuid4()).split("-")[0][:6].upper()
        generated_class_id = f"{data.subject_id.strip()}_{data.semester_id}_{random_suffix}"
        while db.query(CreditClass).filter(CreditClass.class_id == generated_class_id).first():
            random_suffix = str(uuid.uuid4()).split("-")[0][:6].upper()
            generated_class_id = f"{data.subject_id.strip()}_{data.semester_id}_{random_suffix}"

    new_cc = CreditClass(
        class_id=generated_class_id,
        parent_class_id=data.parent_class_id,
        subject_id=data.subject_id.strip(),
        lecturer_id=data.lecturer_id.strip() if data.lecturer_id else None,
        semester_id=data.semester_id,
        class_group=data.class_group.strip() if data.class_group else None,
        class_type=data.class_type,
        start_week=data.start_week,
        end_week=data.end_week,
        max_students=data.max_students,
        status=data.status
    )
    db.add(new_cc)
    
    if data.target_classes:
        for admin_class_id in data.target_classes:
            db.add(ExpectedClassMapping(credit_class_id=generated_class_id, admin_class_id=admin_class_id.strip()))

    try:
        db.commit()
        db.refresh(new_cc)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Lỗi lưu trữ: Kỳ học hoặc Mã lớp hành chính không hợp lệ.")
    
    return {"status": "success", "message": "Tạo lớp tín chỉ thành công!", "data": {"class_id": generated_class_id}}

# ==========================================
# LẤY DANH SÁCH LỚP TÍN CHỈ
# ==========================================
@router.get("/credit-classes")
def list_credit_classes(
    semester_id: Optional[str] = None,
    subject_id: Optional[str] = None,
    lecturer_id: Optional[str] = None,
    status: Optional[str] = None,
    administrative_class_id: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(CreditClass).options(
        joinedload(CreditClass.subject),
        joinedload(CreditClass.lecturer),
        joinedload(CreditClass.expected_mappings)
    )

    if semester_id:
        query = query.filter(CreditClass.semester_id == semester_id.strip())
    if subject_id:
        query = query.filter(CreditClass.subject_id == subject_id.strip())
    if lecturer_id:
        query = query.filter(CreditClass.lecturer_id == lecturer_id.strip())
    if status:
        query = query.filter(CreditClass.status == status.strip())
        
    if administrative_class_id:
        query = query.join(ExpectedClassMapping).filter(ExpectedClassMapping.admin_class_id == administrative_class_id.strip())

    classes = list(dict.fromkeys(query.all()))

    result = []
    for c in classes:
        target_classes = [t.admin_class_id for t in c.expected_mappings]

        subj = c.subject
        subject_name = subj.subject_name if subj else None
        total_credits = subj.credits or (subj.theory_credits + subj.practical_credits) or 0 if subj else 0
        
        result.append({
            "class_id": c.class_id,
            "parent_class_id": c.parent_class_id,
            "subject_id": c.subject_id,
            "subject_name": subject_name,
            "credits": total_credits,
            "lecturer_id": c.lecturer_id,
            "semester_id": c.semester_id,
            "class_group": format_class_group(c),
            "group_number": c.group_number,           
            "sub_group_number": c.sub_group_number,
            "class_type": c.class_type,
            "start_week": c.start_week,
            "end_week": c.end_week,
            "max_students": c.max_students,
            "current_students": c.current_students,
            "status": c.status,
            "target_classes": target_classes
        })
    
    return {"status": "success", "total": len(result), "data": result}

# ==========================================
# CÁC TRUY VẤN TIỆN ÍCH (Lớp biên chế, Học kỳ)
# ==========================================
@router.get("/administrative-classes")
def get_all_admin_classes(db: Session = Depends(get_db)):
    classes = db.query(AdministrativeClass).all()
    return {"status": "success", "data": [{"class_id": c.class_id, "class_name": c.class_name} for c in classes]}

@router.get("/semesters")
def get_semesters(db: Session = Depends(get_db)):
    semesters = db.query(Semester).order_by(Semester.start_date.desc()).all()
    return {"status": "success", "data": [{"semester_id": s.semester_id, "semester": s.semester_number, "academic_year": s.academic_year} for s in semesters]}


# ==========================================
# LẤY CHI TIẾT MỘT LỚP TÍN CHỈ
# ==========================================
@router.get("/credit-classes/{class_id}")
def get_credit_class_detail(class_id: str, db: Session = Depends(get_db)):
    cc = db.query(CreditClass).options(
        joinedload(CreditClass.subject),
        joinedload(CreditClass.lecturer),
        joinedload(CreditClass.expected_mappings),
        joinedload(CreditClass.enrollments)
    ).filter(CreditClass.class_id == class_id.strip()).first()
    
    if not cc:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ này.")
        
    target_classes = [t.admin_class_id for t in cc.expected_mappings]

    subj = cc.subject
    total_credits = subj.credits or (subj.theory_credits + subj.practical_credits) or 0 if subj else 0

    c_dict = {
        "class_id": cc.class_id,
        "parent_class_id": cc.parent_class_id,
        "subject_id": cc.subject_id,
        "subject_name": cc.subject.subject_name if cc.subject else None,
        "credits": total_credits,
        "lecturer_id": cc.lecturer_id,
        "lecturer_name": cc.lecturer.full_name if cc.lecturer else None,
        "semester_id": cc.semester_id,
        "class_group": format_class_group(cc),
        "group_number": c.group_number,          
        "sub_group_number": c.sub_group_number,
        "class_type": cc.class_type,
        "start_week": cc.start_week,
        "end_week": cc.end_week,
        "max_students": cc.max_students,
        "current_students": cc.current_students,
        "status": cc.status,
        "target_classes": target_classes
    }
    return {"status": "success", "data": c_dict}

# ==========================================
# MÔN HỌC SINH VIÊN ĐÃ ĐĂNG KÝ
# ==========================================
@router.get("/students/{student_id}/credit-classes")
def get_student_classes(student_id: str, db: Session = Depends(get_db)):
    enrollments = db.query(ClassEnrollment).options(
        joinedload(ClassEnrollment.credit_class).joinedload(CreditClass.subject)
    ).filter(ClassEnrollment.student_id == student_id.strip().upper()).all()
    
    if not enrollments:
        return {"status": "success", "classes": []}
        
    result = []
    for e in enrollments:
        c = e.credit_class
        if not c: continue
        subj = c.subject
        total_credits = subj.credits or (subj.theory_credits + subj.practical_credits) or 0 if subj else 0
        target_classes = [t.admin_class_id for t in c.expected_mappings] if hasattr(c, 'expected_mappings') and c.expected_mappings else []
        result.append({
            "class_id": c.class_id,
            "subject_id": c.subject_id,
            "subject_name": subj.subject_name if subj else None,
            "lecturer_id": c.lecturer_id,
            "semester_id": c.semester_id,
            "class_group": format_class_group(c),
            "group_number": c.group_number,
            "sub_group_number": c.sub_group_number,
            "class_type": c.class_type,
            "max_students": c.max_students,
            "current_students": c.current_students,
            "status": e.status, 
            "class_status": c.status,
            "credits": total_credits,
            "target_classes": target_classes,
            "enrollment_date": (e.updated_at or e.enrollment_date).isoformat() if (e.updated_at or e.enrollment_date) else None,
        })
        
    return {"status": "success", "classes": result}


# ==========================================
# CẬP NHẬT & XÓA THÔNG TIN LỚP TÍN CHỈ
# ==========================================
@router.put("/credit-classes/{class_id}")
def update_credit_class(class_id: str, data: CreditClassUpdate, db: Session = Depends(get_db)):
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
    if not cc:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ.")

    if data.lecturer_id:
        if not db.query(Lecturer).filter(Lecturer.lecturer_id == data.lecturer_id.strip()).first():
            raise HTTPException(status_code=404, detail=f"Không tìm thấy giảng viên {data.lecturer_id}")
        cc.lecturer_id = data.lecturer_id.strip()

    if data.semester_id: cc.semester_id = data.semester_id.strip()
    if data.class_group is not None: cc.class_group = data.class_group.strip() if data.class_group.strip() else None
    if data.class_type is not None: cc.class_type = data.class_type.strip()
    if data.start_week is not None: cc.start_week = data.start_week
    if data.end_week is not None: cc.end_week = data.end_week

    if data.max_students is not None:
        if data.max_students < cc.current_students:
            raise HTTPException(status_code=400, detail=f"Lớp đang có {cc.current_students} SV, không thể giảm max_students xuống {data.max_students}.")
        cc.max_students = data.max_students

    if data.status: cc.status = data.status.strip()

    if data.target_classes is not None:
        db.query(ExpectedClassMapping).filter(ExpectedClassMapping.credit_class_id == cc.class_id).delete()
        for admin_class_id in data.target_classes:
            db.add(ExpectedClassMapping(credit_class_id=cc.class_id, admin_class_id=admin_class_id.strip()))

    db.commit()
    db.refresh(cc)
    
    return {
        "status": "success",
        "message": f"Đã cập nhật thành công lớp {cc.class_id}",
        "data": {"class_id": cc.class_id, "status": cc.status}
    }

@router.delete("/credit-classes/{class_id}")
def delete_credit_class(class_id: str, db: Session = Depends(get_db)):
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
    if not cc:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ.")
        
    if cc.current_students > 0:
        raise HTTPException(status_code=400, detail=f"Không thể xóa! Lớp này đang có {cc.current_students} sinh viên theo học.")

    db.delete(cc)
    db.commit()
    return {"status": "success", "message": f"Đã xóa lớp tín chỉ {class_id} thành công."}

# =========================================================================
# XẾP LỚP & ĐĂNG KÝ MÔN HỌC (SINH VIÊN)
# =========================================================================
@router.get("/credit-classes/{class_id}/students")
def get_students_in_class(class_id: str, db: Session = Depends(get_db)):
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
    if not cc:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ.")

    enrollments = db.query(ClassEnrollment).filter(ClassEnrollment.class_id == class_id.strip()).all()
    student_list = []
    for enr in enrollments:
        if enr.student:
            student_list.append({
                "student_id": enr.student.student_id,
                "full_name": enr.student.profile.full_name if getattr(enr.student, 'profile', None) else "N/A",
                "administrative_class": enr.student.administrative_class,
                "enrollment_date": enr.updated_at.isoformat() if enr.updated_at else (enr.enrollment_date.isoformat() if enr.enrollment_date else None)
            })
    return {"status": "success", "class_id": class_id, "total_students": len(student_list), "data": student_list}


@router.post("/credit-classes/{class_id}/enrollments")
def enroll_student(class_id: str, student_id: str = Form(...), db: Session = Depends(get_db)):
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
    if not cc: raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp tín chỉ {class_id}")
    if (cc.status or "").lower() != "active": raise HTTPException(status_code=400, detail=f"Lớp tín chỉ {class_id} không mở để đăng ký.")
    
    st = db.query(Student).filter(Student.student_id == student_id.strip().upper()).first()
    if not st: raise HTTPException(status_code=404, detail=f"Không tìm thấy sinh viên {student_id}")
        
    # 1. Xác định danh sách lớp cần đăng ký (Bao gồm lớp cha nếu là Tổ TH)
    classes_to_enroll = [cc]
    if cc.class_type == "Practice" and cc.parent_class_id:
        parent_cc = db.query(CreditClass).filter(CreditClass.class_id == cc.parent_class_id).first()
        if parent_cc:
            classes_to_enroll.append(parent_cc)

    # 2. Lấy danh sách các lớp sinh viên ĐÃ đăng ký
    enrolled_class_ids_query = db.query(ClassEnrollment.class_id).filter(ClassEnrollment.student_id == student_id.strip().upper())
    enrolled_class_ids = [r[0] for r in enrolled_class_ids_query.all()]

    # 3. Kiểm tra sức chứa (Capacity) cho tất cả các lớp liên quan
    new_enroll_ids = []
    for c_enroll in classes_to_enroll:
        if c_enroll.class_id in enrolled_class_ids:
            continue # Bỏ qua nếu đã đăng ký lớp này từ trước
            
        if c_enroll.current_students >= c_enroll.max_students:
             raise HTTPException(status_code=400, detail=f"Lớp {c_enroll.class_id} đã đạt giới hạn sĩ số.")
        
        new_enroll_ids.append(c_enroll.class_id)

    if not new_enroll_ids:
        return {"status": "success", "message": "Sinh viên đã đăng ký các lớp này rồi."}

    # 4. Kiểm tra trùng lịch (Dựa trên danh sách cần thêm mới)
    new_sessions = db.query(ClassSchedule).filter(ClassSchedule.class_id.in_(new_enroll_ids)).all()
    if new_sessions and enrolled_class_ids:
        enrolled_sessions = db.query(ClassSchedule).filter(ClassSchedule.class_id.in_(enrolled_class_ids)).all()
        for ns in new_sessions:
            for es in enrolled_sessions:
                if ns.start_time < es.end_time and ns.end_time > es.start_time:
                    ns_time = ns.start_time.strftime("%d/%m/%Y %H:%M")
                    es_time = es.start_time.strftime("%H:%M")
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Trùng lịch học! Lớp {ns.class_id} ({ns_time}) bị trùng với lớp {es.class_id} ({es_time})."
                    )

    # 5. Lưu toàn bộ vào Database
    for c_id in new_enroll_ids:
        enroll = ClassEnrollment(
            class_id=c_id,
            student_id=student_id.strip().upper(),
            enrollment_date=datetime.now(),
            updated_at=datetime.now(),
            status="Enrolled"
        )
        db.add(enroll)
        
    db.commit()
    return {"status": "success", "message": f"Đã đăng ký thành công: {', '.join(new_enroll_ids)}"}


@router.delete("/credit-classes/{class_id}/enrollments/{student_id}")
def unenroll_student(class_id: str, student_id: str, db: Session = Depends(get_db)):
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
    if not cc: raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp học tín chỉ {class_id}.")
    if cc.status.lower() != "active": raise HTTPException(status_code=400, detail=f"Lớp {class_id} không mở, không thể hủy đăng ký.")
    
    # 1. Xác định chuỗi các lớp cần hủy (Bundled unenrollment)
    classes_to_unenroll = [class_id.strip()]
    
    if cc.class_type == "Practice" and cc.parent_class_id:
        # Nếu hủy TH -> Hủy luôn LT cha
        classes_to_unenroll.append(cc.parent_class_id)
    elif cc.class_type == "Theory":
        # Nếu hủy LT -> Tìm và Hủy luôn Tổ TH con mà SV đang theo học
        child_classes = db.query(CreditClass.class_id).filter(CreditClass.parent_class_id == class_id.strip()).all()
        child_class_ids = [c[0] for c in child_classes]
        if child_class_ids:
            classes_to_unenroll.extend(child_class_ids)

    # 2. Lấy các record enrollments thực tế của sinh viên này
    enrollments = db.query(ClassEnrollment).filter(
        ClassEnrollment.class_id.in_(classes_to_unenroll), 
        ClassEnrollment.student_id == student_id.strip().upper()
    ).all()
    
    if not enrollments: 
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin đăng ký học.")
    
    # 3. Thực thi xóa
    for e in enrollments:
        db.delete(e)
        
    db.commit()
    deleted_ids = [e.class_id for e in enrollments]
    return {"status": "success", "message": f"Đã hủy đăng ký thành công: {', '.join(deleted_ids)}"}


# =========================================================================
# QUẢN LÝ LỊCH HỌC (SESSIONS)
# =========================================================================
@router.post("/schedules")
def add_schedule(
    class_id: str = Form(..., alias="ma_lop_tc"),
    session_date: str = Form(..., alias="ngay_hoc"), 
    room_id: str = Form(..., alias="phong_hoc"),
    start_time: str = Form(..., alias="gio_bat_dau"),
    shift: int = Form(1, alias="ca_hoc"),
    db: Session = Depends(get_db)
):
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
    if not cc: raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp tín chỉ {class_id}")
        
    room = db.query(Classroom).filter(Classroom.room_id == room_id.strip()).first()
    if not room: raise HTTPException(status_code=400, detail=f"Không tìm thấy phòng học {room_id}.")
        
    try:
        dt_date = datetime.strptime(session_date.strip(), "%Y-%m-%d").date()
        time_str = start_time.strip() if len(start_time.strip()) == 8 else start_time.strip() + ":00"
        dt_time = datetime.strptime(time_str, "%H:%M:%S").time()
        dt_start = datetime.combine(dt_date, dt_time)
        dt_end = dt_start + timedelta(hours=3)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Định dạng ngày giờ không hợp lệ: {e}")

    room_conflicts = db.query(ClassSession).filter(ClassSession.room_id == room_id.strip()).all()
    for c in room_conflicts:
        if dt_start < c.end_time and dt_end > c.start_time:
            conflict_time_str = c.start_time.strftime("%H:%M")
            raise HTTPException(status_code=400, detail=f"Trùng lịch: Phòng {room_id} đã có lớp {c.class_id} học lúc {conflict_time_str}.")

    sched = ClassSession(
        class_id=class_id.strip(),
        room_id=room_id.strip(),
        session_date=dt_date,
        shift=shift,
        start_time=dt_start,
        end_time=dt_end
    )
    db.add(sched)
    db.commit()
    return {"status": "success", "message": f"Đã thêm lịch học cho lớp {class_id} tại phòng {room_id}"}


@router.get("/schedules")
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
                    "session_id": s.session_id,
                    "class_id": s.class_id,
                    "session_date": str(s.session_date),
                    "room_id": s.room_id,
                    "start_time": str(s.start_time),
                    "end_time": str(s.end_time),
                    "subject_name": s.credit_class.subject.subject_name if (s.credit_class and s.credit_class.subject) else "N/A"
                }
                for s in schedules
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")


# =========================================================================
# API ĐIỂM DANH (ATTENDANCE)
# =========================================================================
@router.get("/credit-classes/{class_id}/attendance/report")
def get_class_attendance_report(class_id: str, db: Session = Depends(get_db)):
    try:
        schedules = db.query(ClassSession).filter(ClassSession.class_id == class_id.strip()).all()
        session_ids = [s.session_id for s in schedules]
        total_sessions = len(schedules)
        
        enrollments = db.query(ClassEnrollment).filter(ClassEnrollment.class_id == class_id.strip()).all()
        report = []
        
        for e in enrollments:
            student = e.student
            if not student: continue
                
            di_muon = 0
            vang_kp = 0
            co_phep = 0
            
            if total_sessions > 0:
                attendance_records = db.query(AttendanceRecord).filter(
                    AttendanceRecord.student_id == student.student_id,
                    AttendanceRecord.session_id.in_(session_ids)
                ).all()
                
                attended_session_ids = set()
                for record in attendance_records:
                    attended_session_ids.add(record.session_id)
                    if record.status == "Late": di_muon += 1
                    elif record.status == "Excused": co_phep += 1
                    elif record.status == "Absent": vang_kp += 1
                
                now = datetime.now()
                for s in schedules:
                    if s.start_time < now and s.session_id not in attended_session_ids:
                        vang_kp += 1
            
            score = max(0.0, round(10.0 - (di_muon * 0.5) - (vang_kp * 1.0), 1))
            total_absent = vang_kp + co_phep
            ty_le_vang = round((total_absent / total_sessions) * 100, 1) if total_sessions > 0 else 0.0
            
            report.append({
                "mssv": student.student_id,
                "ho_ten": student.profile.full_name if student.profile else "N/A",
                "lop_base": student.administrative_class or "N/A",
                "di_muon": di_muon,
                "vang_kp": vang_kp,
                "co_phep": co_phep,
                "score": score,
                "ty_le_vang": ty_le_vang,
                "trang_thai": "Cấm thi" if ty_le_vang > 20.0 else "Hợp lệ"
            })
            
        return {"status": "success", "report": report}
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {err}")

@router.post("/attendance/manual-checkin")
def teacher_manual_checkin(
    mssv: str = Form(...),
    session_id: int = Form(...), 
    trang_thai: str = Form(...),
    nguoi_xac_nhan: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    try:
        sched = db.query(ClassSession).filter(ClassSession.session_id == session_id).first()
        if not sched:
            raise HTTPException(status_code=404, detail="Không tìm thấy buổi học.")

        existing = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == mssv.strip().upper(),
            AttendanceRecord.session_id == session_id
        ).first()

        if existing:
            existing.status = trang_thai
            existing.notes = f"Sửa bởi {nguoi_xac_nhan or 'Giảng viên'}"
            existing.recorded_at = datetime.now()
        else:
            new_att = AttendanceRecord(
                student_id=mssv.strip().upper(),
                session_id=session_id,
                status=trang_thai,
                notes=f"Điểm danh bởi {nguoi_xac_nhan or 'Giảng viên'}",
                recorded_at=datetime.now()
            )
            db.add(new_att)
            
        db.commit()
        return {"status": "success", "message": "Cập nhật trạng thái điểm danh thủ công thành công."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")

@router.get("/attendance")
def get_recent_attendance_logs(db: Session = Depends(get_db)):
    recent_logs = db.query(AttendanceRecord).order_by(AttendanceRecord.recorded_at.desc()).limit(50).all()
    logs_data = []
    for log in recent_logs:
        logs_data.append({
            "id": log.record_id,
            "mssv": log.student_id,
            "session_id": log.session_id,
            "trang_thai": log.status,
            "recorded_at": log.recorded_at
        })
    return {"status": "success", "logs": logs_data}