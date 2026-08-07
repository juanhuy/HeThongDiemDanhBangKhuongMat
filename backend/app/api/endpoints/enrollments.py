# File: app/api/endpoints/enrollments.py
from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session, joinedload
from datetime import datetime

from app.db.session import get_db
from app.models import CreditClass, ClassEnrollment, Student, ClassSchedule

router = APIRouter()

@router.get("/credit-classes/{class_id}/students", summary="Get Students In Class")
def get_students_in_class(class_id: str, db: Session = Depends(get_db)):
    """Lấy danh sách sinh viên hiện đang theo học trong lớp."""
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
    if not cc: raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ.")
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

@router.get("/students/{student_id}/credit-classes", summary="Get Student Enrolled Classes")
def get_student_enrolled_classes(student_id: str, db: Session = Depends(get_db)):
    """Lấy danh sách các lớp tín chỉ mà sinh viên đã đăng ký."""
    enrollments = db.query(ClassEnrollment).filter(ClassEnrollment.student_id == student_id.strip().upper()).all()
    enroll_map = {}
    for e in enrollments:
        enroll_map[e.class_id] = e.updated_at.isoformat() if e.updated_at else (e.enrollment_date.isoformat() if e.enrollment_date else None)
        
    class_ids = list(enroll_map.keys())
    
    if not class_ids:
        return {"status": "success", "data": []}
        
    classes = db.query(CreditClass).options(
        joinedload(CreditClass.lecturer), joinedload(CreditClass.schedules)
    ).filter(CreditClass.class_id.in_(class_ids)).all()
    
    result = []
    for c in classes:
        subj = c.subject
        total_credits = subj.credits or (subj.theory_credits + subj.practical_credits) or 0 if subj else 0
        target_classes = [t.admin_class_id for t in getattr(c, 'expected_mappings', [])]
        schedules = [{"day_of_week": s.day_of_week, "start_shift": s.start_shift, "end_shift": s.end_shift, "room_id": s.room_id} for s in c.schedules] if hasattr(c, 'schedules') and c.schedules else []
        result.append({
            "class_id": c.class_id,
            "parent_class_id": c.parent_class_id,
            "subject_id": c.subject_id,
            "subject_name": subj.subject_name if subj else None,
            "credits": total_credits,
            "class_type": c.class_type,
            "group_number": c.group_number,
            "sub_group_number": c.sub_group_number,
            "status": c.status,
            "target_classes": target_classes,
            "enrollment_date": enroll_map.get(c.class_id),
            "lecturer_name": c.lecturer.full_name if c.lecturer else None,
            "schedules": schedules
        })
        
    return {"status": "success", "data": result}

@router.post("/credit-classes/{class_id}/enrollments", summary="Enroll Student")
def enroll_student(class_id: str, student_id: str = Form(...), db: Session = Depends(get_db)):
    """Đăng ký môn học cho một sinh viên (Kiểm tra điều kiện, trùng lịch, sĩ số)."""
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
    if not cc: raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp {class_id}")
    if (cc.status or "").lower() != "active": raise HTTPException(status_code=400, detail=f"Lớp {class_id} không mở để đăng ký.")
    st = db.query(Student).filter(Student.student_id == student_id.strip().upper()).first()
    if not st: raise HTTPException(status_code=404, detail=f"Không tìm thấy sinh viên {student_id}")
        
    classes_to_enroll = [cc]
    if cc.class_type == "Practice" and cc.parent_class_id:
        parent_cc = db.query(CreditClass).filter(CreditClass.class_id == cc.parent_class_id).first()
        if parent_cc: classes_to_enroll.append(parent_cc)

    # 1. Hủy các lớp cùng môn học đã đăng ký trước đó (tránh đăng ký nhiều lớp 1 môn)
    subject_id = cc.subject_id
    existing_subject_enrollments = db.query(ClassEnrollment).join(
        CreditClass, ClassEnrollment.class_id == CreditClass.class_id
    ).filter(
        ClassEnrollment.student_id == student_id.strip().upper(),
        CreditClass.subject_id == subject_id
    ).all()

    existing_class_ids = [e.class_id for e in existing_subject_enrollments]
    new_class_ids = [c.class_id for c in classes_to_enroll]

    if set(new_class_ids) == set(existing_class_ids) and len(new_class_ids) > 0:
        return {"status": "success", "message": "Sinh viên đã đăng ký chính xác các lớp này rồi."}

    for e in existing_subject_enrollments:
        db.delete(e)
    db.flush()

    enrolled_class_ids_query = db.query(ClassEnrollment.class_id).filter(ClassEnrollment.student_id == student_id.strip().upper())
    enrolled_class_ids = [r[0] for r in enrolled_class_ids_query.all()]

    new_enroll_ids = []
    for c_enroll in classes_to_enroll:
        if c_enroll.class_id in enrolled_class_ids: continue 
        if c_enroll.current_students >= c_enroll.max_students:
             raise HTTPException(status_code=400, detail=f"Lớp {c_enroll.class_id} đã đạt giới hạn sĩ số.")
        new_enroll_ids.append(c_enroll.class_id)

    if not new_enroll_ids: return {"status": "success", "message": "Sinh viên đã đăng ký các lớp này rồi."}

    new_sessions = db.query(ClassSchedule).filter(ClassSchedule.class_id.in_(new_enroll_ids)).all()
    if new_sessions and enrolled_class_ids:
        enrolled_sessions = db.query(ClassSchedule).filter(ClassSchedule.class_id.in_(enrolled_class_ids)).all()
        for ns in new_sessions:
            for es in enrolled_sessions:
                if ns.start_time < es.end_time and ns.end_time > es.start_time:
                    raise HTTPException(status_code=400, detail=f"Trùng lịch học! Lớp {ns.class_id} bị trùng với {es.class_id}.")

    for c_id in new_enroll_ids:
        enroll = ClassEnrollment(
            class_id=c_id, student_id=student_id.strip().upper(),
            enrollment_date=datetime.now(), updated_at=datetime.now(), status="Enrolled"
        )
        db.add(enroll)
    db.commit()
    return {"status": "success", "message": f"Đã đăng ký thành công: {', '.join(new_enroll_ids)}"}

@router.delete("/credit-classes/{class_id}/enrollments/{student_id}", summary="Unenroll Student")
def unenroll_student(class_id: str, student_id: str, db: Session = Depends(get_db)):
    """Hủy đăng ký học phần của sinh viên (Hủy chuỗi tự động)."""
    cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
    if not cc: raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp học tín chỉ {class_id}.")
    if cc.status.lower() != "active": raise HTTPException(status_code=400, detail=f"Lớp {class_id} không mở, không thể hủy đăng ký.")
    
    classes_to_unenroll = [class_id.strip()]
    if cc.class_type == "Practice" and cc.parent_class_id:
        classes_to_unenroll.append(cc.parent_class_id)
    elif cc.class_type == "Theory":
        child_classes = db.query(CreditClass.class_id).filter(CreditClass.parent_class_id == class_id.strip()).all()
        child_class_ids = [c[0] for c in child_classes]
        if child_class_ids: classes_to_unenroll.extend(child_class_ids)

    enrollments = db.query(ClassEnrollment).filter(
        ClassEnrollment.class_id.in_(classes_to_unenroll), ClassEnrollment.student_id == student_id.strip().upper()
    ).all()
    if not enrollments: raise HTTPException(status_code=404, detail="Không tìm thấy thông tin đăng ký học.")
    for e in enrollments: db.delete(e)
    db.commit()
    deleted_ids = [e.class_id for e in enrollments]
    return {"status": "success", "message": f"Đã hủy đăng ký thành công: {', '.join(deleted_ids)}"}