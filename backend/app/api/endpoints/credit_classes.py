# File: app/api/endpoints/credit_classes.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from typing import Optional, List
from pydantic import BaseModel
import math
import uuid

from app.db.session import get_db
from app.schemas.credit_class import CreditClassCreate, CreditClassUpdate, AutoGenerateRequest, SaveDraftRequest
from app.models import Subject, CreditClass, Lecturer, ExpectedClassMapping

router = APIRouter()

class BulkStatusUpdate(BaseModel):
    class_ids: List[str]
    status: str

def format_class_group(c: CreditClass) -> str:
    if c.sub_group_number is not None: return f"{c.sub_group_number:02d}"
    if c.group_number is not None: return f"{c.group_number:02d}"
    return ""

@router.post("/credit-classes/preview-groups", summary="Preview Auto Generate Classes")
def preview_auto_generate_classes(req: AutoGenerateRequest):
    """Tính toán và trả về bản xem trước (preview) của các nhóm lớp học."""
    num_theory_groups = math.ceil(req.total_students / req.max_theory_capacity)
    students_per_theory = req.total_students // num_theory_groups
    remainder_theory = req.total_students % num_theory_groups

    preview_result = []
    for i in range(num_theory_groups):
        t_students = students_per_theory + (1 if i < remainder_theory else 0)
        theory_draft = {
            "class_group": f"{i+1:02d}", "max_students": t_students,
            "class_type": "Theory", "sub_groups": []
        }

        num_practice_groups = math.ceil(t_students / req.max_practice_capacity)
        students_per_practice = t_students // num_practice_groups
        remainder_practice = t_students % num_practice_groups

        for j in range(num_practice_groups):
            p_students = students_per_practice + (1 if j < remainder_practice else 0)
            theory_draft["sub_groups"].append({
                "class_group": f"Tổ {j+1}", "max_students": p_students, "class_type": "Practice"
            })
            
        preview_result.append(theory_draft)

    return {
        "status": "success",
        "message": f"Dự kiến tạo {num_theory_groups} Nhóm LT và tổng cộng {sum(len(g['sub_groups']) for g in preview_result)} Tổ TH.",
        "data": preview_result
    }

@router.post("/credit-classes/batch", summary="Save Generated Classes")
def save_generated_classes(req: SaveDraftRequest, db: Session = Depends(get_db)):
    """Lưu hàng loạt các lớp học từ bản preview vào CSDL."""
    saved_classes = []
    for t_group in req.groups:
        t_grp = 1
        if t_group.class_group and str(t_group.class_group).isdigit(): t_grp = int(t_group.class_group)
        t_id = f"{req.subject_id.strip()}_{req.semester_id.replace('-', '').replace('_', '')}_N{t_grp:02d}"
        
        new_theory = CreditClass(
            class_id=t_id, subject_id=req.subject_id, lecturer_id=req.lecturer_id,
            semester_id=req.semester_id, class_type="Theory" if t_group.sub_groups else "Combined",
            group_number=t_grp, sub_group_number=None, max_students=t_group.max_students, status="Planning"
        )
        db.add(new_theory)
        db.flush() 
        saved_classes.append(t_id)

        if hasattr(t_group, 'target_classes') and t_group.target_classes:
            for admin_class_id in t_group.target_classes:
                db.add(ExpectedClassMapping(credit_class_id=t_id, admin_class_id=admin_class_id))

        for j, p_group in enumerate(t_group.sub_groups):
            p_grp = int(p_group.class_group) if (p_group.class_group and str(p_group.class_group).isdigit()) else (j + 1)
            p_id = f"{t_id}_T{p_grp:02d}"
            
            new_practice = CreditClass(
                class_id=p_id, parent_class_id=t_id, subject_id=req.subject_id, lecturer_id=req.lecturer_id,
                semester_id=req.semester_id, class_type="Practice", group_number=t_grp,
                sub_group_number=p_grp, max_students=p_group.max_students, status="Planning"
            )
            db.add(new_practice)
            saved_classes.append(p_id)

            if hasattr(t_group, 'target_classes') and t_group.target_classes:
                for admin_class_id in t_group.target_classes:
                    db.add(ExpectedClassMapping(credit_class_id=p_id, admin_class_id=admin_class_id))

    db.commit()
    return {"status": "success", "message": "Thành công", "saved_ids": saved_classes}

@router.post("/credit-classes", status_code=status.HTTP_201_CREATED, summary="Add Credit Class")
def add_credit_class(data: CreditClassCreate, db: Session = Depends(get_db)):
    """Tạo mới một lớp tín chỉ đơn lẻ."""
    if not db.query(Subject).filter(Subject.subject_id == data.subject_id.strip()).first():
        raise HTTPException(status_code=404, detail=f"Không tìm thấy môn học: {data.subject_id}")
    if data.lecturer_id:
        if not db.query(Lecturer).filter(Lecturer.lecturer_id == data.lecturer_id.strip()).first():
            raise HTTPException(status_code=404, detail=f"Không tìm thấy giảng viên: {data.lecturer_id}")

    if data.class_id:
        generated_class_id = data.class_id.strip()
        if db.query(CreditClass).filter(CreditClass.class_id == generated_class_id).first():
            raise HTTPException(status_code=400, detail=f"Mã lớp tín chỉ '{generated_class_id}' đã tồn tại.")
    else:
        random_suffix = str(uuid.uuid4()).split("-")[0][:6].upper()
        generated_class_id = f"{data.subject_id.strip()}_{data.semester_id}_{random_suffix}"
        while db.query(CreditClass).filter(CreditClass.class_id == generated_class_id).first():
            random_suffix = str(uuid.uuid4()).split("-")[0][:6].upper()
            generated_class_id = f"{data.subject_id.strip()}_{data.semester_id}_{random_suffix}"

    new_cc = CreditClass(
        class_id=generated_class_id, parent_class_id=data.parent_class_id, subject_id=data.subject_id.strip(),
        lecturer_id=data.lecturer_id.strip() if data.lecturer_id else None, semester_id=data.semester_id,
        class_group=data.class_group.strip() if data.class_group else None, class_type=data.class_type,
        start_week=data.start_week, end_week=data.end_week, max_students=data.max_students, status=data.status
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

@router.get("/credit-classes", summary="List Credit Classes")
def list_credit_classes(
    semester_id: Optional[str] = Query(None), subject_id: Optional[str] = Query(None),
    lecturer_id: Optional[str] = Query(None), status: Optional[str] = Query(None),
    administrative_class_id: Optional[str] = Query(None), major_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Lấy danh sách các lớp học tín chỉ đa điều kiện lọc."""
    query = db.query(CreditClass).options(
        joinedload(CreditClass.subject), joinedload(CreditClass.lecturer), joinedload(CreditClass.expected_mappings), joinedload(CreditClass.schedules)
    )
    if semester_id: query = query.filter(CreditClass.semester_id == semester_id.strip())
    if subject_id: query = query.filter(CreditClass.subject_id == subject_id.strip())
    if lecturer_id: query = query.filter(CreditClass.lecturer_id == lecturer_id.strip())
    if status: query = query.filter(CreditClass.status == status.strip())
    if administrative_class_id: query = query.join(ExpectedClassMapping).filter(ExpectedClassMapping.admin_class_id == administrative_class_id.strip())
    if major_id: query = query.join(Subject).filter(Subject.major_id == major_id.strip())

    classes = list(dict.fromkeys(query.all()))
    result = []
    for c in classes:
        target_classes = [t.admin_class_id for t in c.expected_mappings]
        subj = c.subject
        total_credits = subj.credits or (subj.theory_credits + subj.practical_credits) or 0 if subj else 0
        schedules = [{"day_of_week": s.day_of_week, "start_shift": s.start_shift, "end_shift": s.end_shift, "room_id": s.room_id} for s in c.schedules] if hasattr(c, 'schedules') and c.schedules else []
        result.append({
            "class_id": c.class_id, "parent_class_id": c.parent_class_id, "subject_id": c.subject_id,
            "subject_name": subj.subject_name if subj else None, "credits": total_credits,
            "lecturer_id": c.lecturer_id, "lecturer_name": c.lecturer.full_name if c.lecturer else None,
            "semester_id": c.semester_id, "class_group": format_class_group(c),
            "group_number": c.group_number, "sub_group_number": c.sub_group_number,
            "class_type": c.class_type, "start_week": c.start_week, "end_week": c.end_week,
            "max_students": c.max_students, "current_students": c.current_students,
            "status": c.status, "target_classes": target_classes, "schedules": schedules
        })
    return {"status": "success", "total": len(result), "data": result}

@router.get("/credit-classes/{class_id}", summary="Get Credit Class Detail")
def get_credit_class_detail(class_id: str, db: Session = Depends(get_db)):
    """Lấy thông tin cấu hình chi tiết của một lớp học tín chỉ."""
    cc = db.query(CreditClass).options(
        joinedload(CreditClass.subject), joinedload(CreditClass.lecturer),
        joinedload(CreditClass.expected_mappings), joinedload(CreditClass.enrollments)
    ).filter(CreditClass.class_id == class_id.strip()).first()
    
    if not cc: raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ này.")
    target_classes = [t.admin_class_id for t in cc.expected_mappings]
    subj = cc.subject
    total_credits = subj.credits or (subj.theory_credits + subj.practical_credits) or 0 if subj else 0
    c_dict = {
        "class_id": cc.class_id, "parent_class_id": cc.parent_class_id, "subject_id": cc.subject_id,
        "subject_name": cc.subject.subject_name if cc.subject else None, "credits": total_credits,
        "lecturer_id": cc.lecturer_id, "lecturer_name": cc.lecturer.full_name if cc.lecturer else None,
        "semester_id": cc.semester_id, "class_group": format_class_group(cc), "group_number": cc.group_number,          
        "sub_group_number": cc.sub_group_number, "class_type": cc.class_type, "start_week": cc.start_week,
        "end_week": cc.end_week, "max_students": cc.max_students, "current_students": cc.current_students,
        "status": cc.status, "target_classes": target_classes
    }
    return {"status": "success", "data": c_dict}

@router.put("/credit-classes/{class_id}", summary="Update Credit Class")
def update_credit_class(class_id: str, data: CreditClassUpdate, db: Session = Depends(get_db)):
    """Cập nhật các thông số của một lớp học tín chỉ."""
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
    if not cc: raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ.")
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
            raise HTTPException(status_code=400, detail=f"Lớp đang có {cc.current_students} SV, không thể giảm.")
        cc.max_students = data.max_students
    if data.status: cc.status = data.status.strip()
    if data.target_classes is not None:
        db.query(ExpectedClassMapping).filter(ExpectedClassMapping.credit_class_id == cc.class_id).delete()
        for admin_class_id in data.target_classes:
            db.add(ExpectedClassMapping(credit_class_id=cc.class_id, admin_class_id=admin_class_id.strip()))
    db.commit()
    db.refresh(cc)
    return {"status": "success", "message": f"Đã cập nhật thành công lớp {cc.class_id}", "data": {"class_id": cc.class_id, "status": cc.status}}

@router.put("/credit-classes/bulk-status", summary="Update Bulk Status")
def update_bulk_status(req: BulkStatusUpdate, db: Session = Depends(get_db)):
    """Cập nhật trạng thái cho nhiều lớp tín chỉ cùng một lúc."""
    if not req.class_ids: raise HTTPException(status_code=400, detail="Không có lớp nào được chọn")
    db.query(CreditClass).filter(CreditClass.class_id.in_(req.class_ids)).update({"status": req.status}, synchronize_session=False)
    db.commit()
    return {"status": "success", "message": f"Đã cập nhật trạng thái {req.status} cho {len(req.class_ids)} lớp."}

@router.delete("/credit-classes/{class_id}", summary="Delete Credit Class")
def delete_credit_class(class_id: str, db: Session = Depends(get_db)):
    """Xóa một lớp tín chỉ ra khỏi hệ thống."""
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
    if not cc: raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ.")
    if cc.current_students > 0: raise HTTPException(status_code=400, detail=f"Không thể xóa lớp có sinh viên.")
    db.delete(cc)
    db.commit()
    return {"status": "success", "message": f"Đã xóa lớp tín chỉ {class_id} thành công."}