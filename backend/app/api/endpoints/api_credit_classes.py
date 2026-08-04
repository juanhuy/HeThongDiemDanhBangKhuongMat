from fastapi import APIRouter, Depends, HTTPException, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List
import pandas as pd
import io
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from app.schemas.credit_class import CreditClassCreate, CreditClassUpdate, CreditClassResponse

import math
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.credit_class import AutoGenerateRequest, SaveDraftRequest
from app.models import CreditClass

from app.models import ClassTargetAudience

from fastapi import HTTPException, status, APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import uuid

from app.db.session import get_db
from app.models import (
    Subject, CreditClass, ClassEnrollment, ClassSession,
    ClassSchedule, AttendanceRecord, Student, Lecturer
)

router = APIRouter()

# =========================================================================
# BƯỚC 2 & 3: API TÍNH TOÁN VÀ TRẢ VỀ BẢN PREVIEW CHO ADMIN (Chưa lưu DB)
# =========================================================================
@router.post("/lop_tin_chi/preview-groups")
def preview_auto_generate_classes(req: AutoGenerateRequest):
    """
    Máy tính toán số Nhóm và số Tổ dựa trên tổng sinh viên và sức chứa.
    Trả về cấu trúc JSON cho Admin review trên UI.
    """
    # 1. Tính toán Nhóm Lý Thuyết
    num_theory_groups = math.ceil(req.total_students / req.max_theory_capacity)
    students_per_theory = req.total_students // num_theory_groups
    remainder_theory = req.total_students % num_theory_groups

    preview_result = []

    for i in range(num_theory_groups):
        # Chia đều sinh viên dư cho các nhóm đầu
        t_students = students_per_theory + (1 if i < remainder_theory else 0)
        
        theory_draft = {
            "class_group": f"{i+1:02d}", # Định dạng 01, 02
            "max_students": t_students,
            "class_type": "Theory",
            "sub_groups": []
        }

        # 2. Tính toán Tổ Thực Hành cho Nhóm này
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
# BƯỚC 5: API NHẬN BẢN PREVIEW ĐÃ CHỈNH SỬA TỪ ADMIN VÀ LƯU VÀO DB
# =========================================================================
@router.post("/lop_tin_chi/save-draft")
def save_generated_classes(req: SaveDraftRequest, db: Session = Depends(get_db)):
    saved_classes = []

    for t_group in req.groups:
        t_id = f"{req.subject_id}_{req.semester_id}_{str(uuid.uuid4()).split('-')[0][:6].upper()}"
        
        new_theory = CreditClass(
            class_id=t_id,
            subject_id=req.subject_id,
            lecturer_id=req.lecturer_id,
            semester_id=req.semester_id, # ĐÃ SỬA THÀNH semester_id
            class_type="Theory",
            class_group=t_group.class_group,
            max_students=t_group.max_students,
            status="Planning"
        )
        db.add(new_theory)
        db.flush() 
        saved_classes.append(t_id)

        # ĐÃ THÊM: Lưu Lớp hành chính vào bảng trung gian
        if hasattr(t_group, 'target_classes') and t_group.target_classes:
            for admin_class_id in t_group.target_classes:
                db.add(ClassTargetAudience(class_id=t_id, administrative_class_id=admin_class_id))

        for p_group in t_group.sub_groups:
            p_id = f"{req.subject_id}_{req.semester_id}_{str(uuid.uuid4()).split('-')[0][:6].upper()}"
            new_practice = CreditClass(
                class_id=p_id,
                parent_class_id=t_id,
                subject_id=req.subject_id,
                lecturer_id=req.lecturer_id,
                semester_id=req.semester_id, # ĐÃ SỬA THÀNH semester_id
                class_type="Practice",
                class_group=p_group.class_group,
                max_students=p_group.max_students,
                status="Planning"
            )
            db.add(new_practice)
            saved_classes.append(p_id)

    db.commit()
    return {"status": "success", "message": "Thành công", "saved_ids": saved_classes}


# =========================================================================
# 1. QUẢN LÝ LỚP TÍN CHỈ
# =========================================================================
@router.post("/lop_tin_chi", status_code=status.HTTP_201_CREATED)
def add_credit_class(data: CreditClassCreate, db: Session = Depends(get_db)):
    # 1. Kiểm tra Môn học
    if not db.query(Subject).filter(Subject.subject_id == data.subject_id.strip()).first():
        raise HTTPException(status_code=404, detail=f"Không tìm thấy môn học: {data.subject_id}")
        
    # 2. Kiểm tra Giảng viên (nếu có)
    if data.lecturer_id:
        if not db.query(Lecturer).filter(Lecturer.lecturer_id == data.lecturer_id.strip()).first():
            raise HTTPException(status_code=404, detail=f"Không tìm thấy giảng viên: {data.lecturer_id}")

    # 3. XỬ LÝ MÃ LỚP (CLASS ID) VÀ KIỂM TRA TRÙNG LẶP
    if data.class_id:
        generated_class_id = data.class_id.strip()
        # [Đã fix]: Bắt lỗi 400 nếu người dùng tự truyền mã nhưng mã này đã tồn tại
        if db.query(CreditClass).filter(CreditClass.class_id == generated_class_id).first():
            raise HTTPException(
                status_code=400, 
                detail=f"Mã lớp tín chỉ '{generated_class_id}' đã tồn tại trên hệ thống."
            )
    else:
        # Tự động sinh ID và đảm bảo không trùng lặp (dùng vòng lặp while)
        random_suffix = str(uuid.uuid4()).split("-")[0][:6].upper()
        generated_class_id = f"{data.subject_id.strip()}_{data.semester_id}_{random_suffix}"
        
        while db.query(CreditClass).filter(CreditClass.class_id == generated_class_id).first():
            random_suffix = str(uuid.uuid4()).split("-")[0][:6].upper()
            generated_class_id = f"{data.subject_id.strip()}_{data.semester_id}_{random_suffix}"

    # 4. TẠO ĐỐI TƯỢNG LỚP TÍN CHỈ
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
    
    # 5. XỬ LÝ LỚP GHÉP (BẢNG TRUNG GIAN)
    if data.target_classes:
        for admin_class_id in data.target_classes:
            db.add(ClassTargetAudience(
                class_id=generated_class_id, 
                administrative_class_id=admin_class_id.strip()
            ))

    # 6. COMMIT VÀ XỬ LÝ NGOẠI LỆ (Bảo vệ Database)
    try:
        db.commit()
        db.refresh(new_cc)
    except IntegrityError:
        # [Đã fix]: Bắt lỗi nếu frontend gửi sai semester_id hoặc target_classes không có trong DB
        # Rollback giao dịch để tránh treo database
        db.rollback()
        raise HTTPException(
            status_code=400, 
            detail="Lỗi lưu trữ: Kỳ học (semester_id) hoặc Mã lớp hành chính không hợp lệ/chưa tồn tại trên hệ thống."
        )
    
    return {
        "status": "success", 
        "message": "Tạo lớp tín chỉ thành công!",
        "data": {
            "class_id": generated_class_id
        }
    }

# ==========================================
# 2. LẤY DANH SÁCH LỚP TÍN CHỈ (CÓ FILTER)
# ==========================================
@router.get("/lop_tin_chi")
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
        joinedload(CreditClass.target_audiences)
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
        query = query.join(ClassTargetAudience).filter(
            ClassTargetAudience.administrative_class_id == administrative_class_id.strip()
        )

    # Convert to dictionary and back to list to deduplicate entities while preserving order
    classes = list(dict.fromkeys(query.all()))
    
    result = []
    for c in classes:
        target_classes = [t.administrative_class_id for t in c.target_audiences]
        
        result.append({
            "class_id": c.class_id,
            "parent_class_id": c.parent_class_id,
            "subject_id": c.subject_id,
            "lecturer_id": c.lecturer_id,
            "semester_id": c.semester_id,
            "class_group": c.class_group,
            "class_type": c.class_type,
            "start_week": c.start_week,
            "end_week": c.end_week,
            "max_students": c.max_students,
            "current_students": c.current_students,
            "status": c.status,
            "target_classes": target_classes
        })
    
    return {"status": "success", "total": len(result), "data": result}

from app.models.administrative_class import AdministrativeClass
@router.get("/administrative-classes")
def get_all_admin_classes(db: Session = Depends(get_db)):
    classes = db.query(AdministrativeClass).all()
    return {"status": "success", "data": [{"class_id": c.class_id, "class_name": c.class_name} for c in classes]}


# ==========================================
# 3. LẤY CHI TIẾT MỘT LỚP TÍN CHỈ
# ==========================================
@router.get("/lop_tin_chi/{class_id}")
def get_credit_class_detail(class_id: str, db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết của một lớp học tín chỉ bằng class_id"""
    cc = db.query(CreditClass).options(
        joinedload(CreditClass.subject),
        joinedload(CreditClass.lecturer),
        joinedload(CreditClass.target_audiences),
        joinedload(CreditClass.enrollments)
    ).filter(CreditClass.class_id == class_id.strip()).first()
    
    if not cc:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ này.")
        
    target_classes = [t.administrative_class_id for t in cc.target_audiences]
    c_dict = {
        "class_id": cc.class_id,
        "parent_class_id": cc.parent_class_id,
        "subject_id": cc.subject_id,
        "subject_name": cc.subject.subject_name if cc.subject else None,
        "lecturer_id": cc.lecturer_id,
        "lecturer_name": cc.lecturer.full_name if cc.lecturer else None,
        "semester_id": cc.semester_id,
        "class_group": cc.class_group,
        "class_type": cc.class_type,
        "start_week": cc.start_week,
        "end_week": cc.end_week,
        "max_students": cc.max_students,
        "current_students": cc.current_students,
        "status": cc.status,
        "target_classes": target_classes
    }
        
    return {
        "status": "success",
        "data": c_dict
    }

@router.get("/students/{mssv}/classes")
def get_student_classes(mssv: str, db: Session = Depends(get_db)):
    """Lấy danh sách các lớp tín chỉ mà sinh viên đã đăng ký kèm ngày đăng ký và số tín chỉ"""
    enrollments = db.query(ClassEnrollment).options(
        joinedload(ClassEnrollment.credit_class).joinedload(CreditClass.subject)
    ).filter(ClassEnrollment.student_id == mssv.strip().upper()).all()
    
    if not enrollments:
        return {"status": "success", "classes": []}
        
    result = []
    for e in enrollments:
        c = e.credit_class
        if not c:
            continue
        subj = c.subject
        total_credits = 0
        if subj:
            total_credits = subj.credits or (subj.theory_credits + subj.practical_credits) or 0
        target_classes = [t.administrative_class_id for t in c.target_audiences] if hasattr(c, 'target_audiences') and c.target_audiences else []
        result.append({
            "class_id": c.class_id,
            "subject_id": c.subject_id,
            "subject_name": subj.subject_name if subj else None,
            "lecturer_id": c.lecturer_id,
            "semester_id": c.semester_id,
            "class_group": c.class_group,
            "class_type": c.class_type,
            "max_students": c.max_students,
            "current_students": c.current_students,
            "status": e.status,           # enrollment status, not class status
            "class_status": c.status,     # actual credit class status
            "credits": total_credits,
            "target_classes": target_classes,
            "enrollment_date": (e.updated_at or e.enrollment_date).isoformat() if (e.updated_at or e.enrollment_date) else None,
        })
        
    return {"status": "success", "classes": result}


# ==========================================
# 4. CẬP NHẬT THÔNG TIN LỚP TÍN CHỈ
# ==========================================
@router.put("/lop_tin_chi/{class_id}")
def update_credit_class(class_id: str, data: CreditClassUpdate, db: Session = Depends(get_db)):
    """Cập nhật thông tin (Giảng viên, Sĩ số, Trạng thái...)"""
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
    
    if not cc:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ.")

    if data.lecturer_id:
        if not db.query(Lecturer).filter(Lecturer.lecturer_id == data.lecturer_id.strip()).first():
            raise HTTPException(status_code=404, detail=f"Không tìm thấy giảng viên {data.lecturer_id}")
        cc.lecturer_id = data.lecturer_id.strip()

    if data.semester_id:
        cc.semester_id = data.semester_id.strip()

    if data.class_group is not None:
        cc.class_group = data.class_group.strip() if data.class_group.strip() else None

    if data.class_type is not None:
        cc.class_type = data.class_type.strip()

    if data.start_week is not None:
        cc.start_week = data.start_week

    if data.end_week is not None:
        cc.end_week = data.end_week

    if data.max_students is not None:
        if data.max_students < cc.current_students:
            raise HTTPException(
                status_code=400, 
                detail=f"Lỗi: Lớp đang có {cc.current_students} SV, không thể giảm max_students xuống {data.max_students}."
            )
        cc.max_students = data.max_students

    if data.status:
        cc.status = data.status.strip()

    if data.target_classes is not None:
        db.query(ClassTargetAudience).filter(ClassTargetAudience.class_id == cc.class_id).delete()
        for admin_class_id in data.target_classes:
            db.add(ClassTargetAudience(class_id=cc.class_id, administrative_class_id=admin_class_id.strip()))

    db.commit()
    db.refresh(cc)
    
    return {
        "status": "success",
        "message": f"Đã cập nhật thành công lớp {cc.class_id}",
        "data": {
            "class_id": cc.class_id,
            "subject_id": cc.subject_id,
            "lecturer_id": cc.lecturer_id,
            "semester_id": cc.semester_id,
            "class_group": cc.class_group,
            "class_type": cc.class_type,
            "max_students": cc.max_students,
            "current_students": cc.current_students,
            "status": cc.status
        }
    }

# ==========================================
# 5. XÓA LỚP TÍN CHỈ
# ==========================================
@router.delete("/lop_tin_chi/{class_id}")
def delete_credit_class(class_id: str, db: Session = Depends(get_db)):
    """Xóa hoàn toàn lớp tín chỉ khỏi hệ thống"""
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
    
    if not cc:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ.")
        
    # Logic nghiệp vụ: Tuyệt đối không cho xóa lớp nếu đã có sinh viên đăng ký (tránh lỗi database & đào tạo)
    if cc.current_students > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Không thể xóa! Lớp này đang có {cc.current_students} sinh viên theo học. Hãy thử đổi trạng thái thành 'Cancelled' thay vì xóa."
        )

    db.delete(cc)
    db.commit()
    
    return {
        "status": "success",
        "message": f"Đã xóa lớp tín chỉ {class_id} thành công."
    }

# =========================================================================
# 6. LẤY DANH SÁCH SINH VIÊN ĐÃ ĐĂNG KÝ VÀO LỚP
# =========================================================================
@router.get("/lop_tin_chi/{class_id}/sinh_vien")
def get_students_in_class(class_id: str, db: Session = Depends(get_db)):
    """Truy vấn danh sách sinh viên đang học trong lớp tín chỉ này"""
    
    # 1. Kiểm tra lớp có tồn tại không
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
    if not cc:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ.")

    # 2. Truy vấn danh sách enrollment (đăng ký) liên kết với sinh viên
    # Lưu ý: Yêu cầu bảng ClassEnrollment phải có relationship tới Student
    enrollments = db.query(ClassEnrollment).filter(ClassEnrollment.class_id == class_id.strip()).all()
    
    student_list = []
    for enr in enrollments:
        if enr.student:  # Giả sử trong model ClassEnrollment bạn có config relationship tên là 'student'
            student_list.append({
                "student_id": enr.student.student_id,
                "full_name": enr.student.profile.full_name if getattr(enr.student, 'profile', None) else "N/A",
                "administrative_class": enr.student.administrative_class,
                "enrollment_date": enr.updated_at.isoformat() if enr.updated_at else (enr.enrollment_date.isoformat() if enr.enrollment_date else None)
            })

    return {
        "status": "success",
        "class_id": class_id,
        "total_students": len(student_list),
        "data": student_list
    }




# =========================================================================
# 2. XẾP LỚP & ĐĂNG KÝ MÔN HỌC
# =========================================================================
@router.post("/sinh_vien_lop_tin_chi")
def enroll_student(ma_lop_tc: str = Form(...), mssv: str = Form(...), db: Session = Depends(get_db)):
    """Đăng ký 1 sinh viên vào lớp tín chỉ (Có kiểm tra trùng lịch)"""
    cc = db.query(CreditClass).filter(CreditClass.class_id == ma_lop_tc.strip()).first()
    if not cc:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp tín chỉ {ma_lop_tc}")
    if cc.status.lower() != "active":
        raise HTTPException(status_code=400, detail=f"Lớp tín chỉ {ma_lop_tc} không mở để đăng ký.")
    st = db.query(Student).filter(Student.student_id == mssv.strip().upper()).first()
    if not st:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy sinh viên {mssv}")
        
    existing = db.query(ClassEnrollment).filter(
        ClassEnrollment.class_id == ma_lop_tc.strip(),
        ClassEnrollment.student_id == mssv.strip().upper()
    ).first()
    
    if existing:
        return {"status": "success", "message": f"Sinh viên {mssv} đã có trong lớp {ma_lop_tc}"}
        
    # Logic kiểm tra trùng lịch bằng Start Time và End Time
    new_sessions = db.query(ClassSchedule).filter(ClassSchedule.class_id == ma_lop_tc.strip()).all()
    if new_sessions:
        enrolled_classes = db.query(ClassEnrollment).filter(
            ClassEnrollment.student_id == mssv.strip().upper()
        ).all()
        enrolled_class_ids = [e.class_id for e in enrolled_classes]
        
        if enrolled_class_ids:
            enrolled_sessions = db.query(ClassSchedule).filter(
                ClassSchedule.class_id.in_(enrolled_class_ids)
            ).all()
            
            for ns in new_sessions:
                for es in enrolled_sessions:
                    # Nếu thời gian bắt đầu của ca mới nhỏ hơn kết thúc ca cũ VÀ kết thúc ca mới lớn hơn bắt đầu ca cũ -> TRÙNG
                    if ns.start_time < es.end_time and ns.end_time > es.start_time:
                        ns_time = ns.start_time.strftime("%d/%m/%Y %H:%M")
                        es_time = es.start_time.strftime("%H:%M")
                        raise HTTPException(
                            status_code=400,
                            detail=f"Trùng lịch học! Lớp {ma_lop_tc} ({ns_time}) bị trùng với lớp {es.class_id} ({es_time}) bạn đã đăng ký."
                        )

    enroll = ClassEnrollment(
        class_id=ma_lop_tc.strip(),
        student_id=mssv.strip().upper(),
        enrollment_date=datetime.now(),
        updated_at=datetime.now(),
        status="Enrolled"
    )
    db.add(enroll)
    # Tránh cộng tay vì Database Trigger đã tự động update current_students
    db.commit()
    return {"status": "success", "message": f"Đã đăng ký sinh viên {mssv} vào lớp {ma_lop_tc}"}


@router.delete("/sinh_vien_lop_tin_chi/{ma_lop_tc}/{mssv}")
def unenroll_student(ma_lop_tc: str, mssv: str, db: Session = Depends(get_db)):
    """Hủy đăng ký lớp tín chỉ nếu lớp vẫn mở (status='Active')"""
    # Kiểm tra lớp học tồn tại
    cc = db.query(CreditClass).filter(CreditClass.class_id == ma_lop_tc.strip()).first()
    if not cc:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp học tín chỉ {ma_lop_tc}.")
    # Kiểm tra lớp còn mở để cho phép hủy đăng ký
    if cc.status.lower() != "active":
        raise HTTPException(
            status_code=400,
            detail=f"Lớp tín chỉ {ma_lop_tc} không mở, không thể hủy đăng ký."
        )
    # Tìm bản ghi enrollment
    enrollment = db.query(ClassEnrollment).filter(
        ClassEnrollment.class_id == ma_lop_tc.strip(),
        ClassEnrollment.student_id == mssv.strip().upper()
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin đăng ký học.")
    # Xóa bản ghi và cập nhật số lượng sinh viên (Trigger MySQL tự xử lý)
    db.delete(enrollment)
    db.commit()
    return {"status": "success", "message": f"Đã hủy đăng ký lớp {ma_lop_tc} thành công."}


# =========================================================================
# 3. QUẢN LÝ LỊCH HỌC (SESSIONS)
# =========================================================================
@router.post("/lich_hoc_chi_tiet")
def add_schedule(
    ma_lop_tc: str = Form(...),
    ngay_hoc: str = Form(...), 
    phong_hoc: str = Form(...),
    gio_bat_dau: str = Form(...),
    ca_hoc: int = Form(1),
    db: Session = Depends(get_db)
):
    """Thêm một tiết học (Buổi học) mới vào lịch"""
    cc = db.query(CreditClass).filter(CreditClass.class_id == ma_lop_tc.strip()).first()
    if not cc:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp tín chỉ {ma_lop_tc}")
        
    try:
        dt_date = datetime.strptime(ngay_hoc.strip(), "%Y-%m-%d").date()
        time_str = gio_bat_dau.strip() if len(gio_bat_dau.strip()) == 8 else gio_bat_dau.strip() + ":00"
        dt_time = datetime.strptime(time_str, "%H:%M:%S").time()
        
        # Mặc định ca học 3 tiếng
        dt_start = datetime.combine(dt_date, dt_time)
        dt_end = dt_start + timedelta(hours=3)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Định dạng ngày giờ không hợp lệ: {e}")

    # Kiểm tra trùng lịch PHÒNG HỌC
    room_conflicts = db.query(ClassSchedule).filter(ClassSchedule.room_id == phong_hoc.strip()).all()
    for c in room_conflicts:
        if dt_start < c.end_time and dt_end > c.start_time:
            conflict_time_str = c.start_time.strftime("%H:%M")
            raise HTTPException(
                status_code=400, 
                detail=f"Trùng lịch: Phòng {phong_hoc} đã có lớp {c.class_id} học lúc {conflict_time_str}."
            )

    sched = ClassSchedule(
        class_id=ma_lop_tc.strip(),
        room_id=phong_hoc.strip(),
        session_date=dt_date,
        shift=ca_hoc,
        start_time=dt_start,
        end_time=dt_end
    )
    db.add(sched)
    db.commit()
    return {"status": "success", "message": f"Đã thêm lịch học cho lớp {ma_lop_tc} tại phòng {phong_hoc}"}


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
# 4. BÁO CÁO ĐIỂM DANH
# =========================================================================
@router.get("/reports/attendance")
def get_class_attendance_report(ma_lop_tc: str, db: Session = Depends(get_db)):
    try:
        # Lấy tất cả lịch học của lớp
        schedules = db.query(ClassSession).filter(ClassSession.class_id == ma_lop_tc.strip()).all()
        session_ids = [s.session_id for s in schedules]
        total_sessions = len(schedules)
        
        enrollments = db.query(ClassEnrollment).filter(ClassEnrollment.class_id == ma_lop_tc.strip()).all()
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
                
                # Check các buổi học đã diễn ra nhưng không có log quét mặt
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


# =========================================================================
# 5. GIẢNG VIÊN ĐIỂM DANH THỦ CÔNG & ĐƠN XIN NGHỈ
# =========================================================================
@router.post("/teacher/manual_checkin")
def teacher_manual_checkin(
    mssv: str = Form(...),
    ma_buoi_hoc: int = Form(...), 
    trang_thai: str = Form(...), # Present, Late, Absent, Excused
    nguoi_xac_nhan: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    try:
        sched = db.query(ClassSession).filter(ClassSession.session_id == ma_buoi_hoc).first()
        if not sched:
            raise HTTPException(status_code=404, detail="Không tìm thấy buổi học.")

        existing = db.query(AttendanceRecord).filter(
            AttendanceRecord.student_id == mssv.strip().upper(),
            AttendanceRecord.session_id == ma_buoi_hoc
        ).first()

        if existing:
            existing.status = trang_thai
            existing.notes = f"Sửa bởi {nguoi_xac_nhan or 'Giảng viên'}"
            existing.recorded_at = datetime.now()
        else:
            new_att = AttendanceRecord(
                student_id=mssv.strip().upper(),
                session_id=ma_buoi_hoc,
                status=trang_thai,
                notes=f"Điểm danh bởi {nguoi_xac_nhan or 'Giảng viên'}",
                recorded_at=datetime.now()
            )
            db.add(new_att)
            
        db.commit()
        return {"status": "success", "message": f"Cập nhật trạng thái điểm danh thủ công thành công."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")


# ==========================================
# 11. API LẤY LOG ĐIỂM DANH GẦN ĐÂY NHẤT (DÙNG CHO THÔNG BÁO REAL-TIME TRÊN APP)
# ==========================================
@router.get("/attendance")
def get_recent_attendance_logs(db: Session = Depends(get_db)):
    """Lấy danh sách các bản ghi điểm danh gần đây nhất để hiển thị realtime trên UI"""
    recent_logs = db.query(AttendanceRecord).order_by(AttendanceRecord.recorded_at.desc()).limit(50).all()
    
    logs_data = []
    for log in recent_logs:
        logs_data.append({
            "id": log.record_id,
            "mssv": log.student_id,
            "ma_buoi_hoc": log.session_id,
            "trang_thai": log.status,
            "recorded_at": log.recorded_at
        })
        
    return {"status": "success", "logs": logs_data}
