# from fastapi import APIRouter, Depends, HTTPException, Form, status, Query
# from fastapi.responses import StreamingResponse
# from sqlalchemy.orm import Session, joinedload
# from sqlalchemy.exc import IntegrityError
# from datetime import datetime, timedelta
# from typing import Optional, List
# import math
# import uuid

# from pydantic import BaseModel, Field
# from app.models import Subject

# from app.db.session import get_db
# from app.schemas.credit_class import CreditClassCreate, CreditClassUpdate, CreditClassResponse, AutoGenerateRequest, SaveDraftRequest
# from app.models import (
#     Subject, CreditClass, ClassEnrollment, ClassSession,
#     ClassSchedule, AttendanceRecord, Student, Lecturer, ExpectedClassMapping
# )
# from app.models.administrative_class import AdministrativeClass
# from app.models.semester import Semester
# from app.models.classroom import Classroom

# router = APIRouter()

# # =========================================================================
# # PYDANTIC SCHEMAS
# # =========================================================================
# class BulkStatusUpdate(BaseModel):
#     class_ids: List[str]
#     status: str

# class CheckConflictRequest(BaseModel):
#     room_id: str = Field(..., description="Mã phòng học")
#     lecturer_id: Optional[str] = Field(None, description="Mã giảng viên (Để kiểm tra lịch GV)")
#     session_date: str = Field(..., description="Ngày học dự kiến (YYYY-MM-DD)")
#     start_time: str = Field(..., description="Giờ bắt đầu (HH:MM:SS)")
#     end_time: str = Field(..., description="Giờ kết thúc (HH:MM:SS)")

# class AutoSuggestRequest(BaseModel):
#     credit_class_id: str = Field(..., description="Mã lớp tín chỉ cần xếp lịch")
#     session_date: str = Field(..., description="Ngày dự kiến xếp lịch (YYYY-MM-DD)")
#     required_room_type: str = Field("Theory", description="Loại phòng yêu cầu (Theory/Practice)")

# def format_class_group(c: CreditClass) -> str:
#     if c.sub_group_number is not None:
#         return f"{c.sub_group_number:02d}"
#     if c.group_number is not None:
#         return f"{c.group_number:02d}"
#     return ""

# # =========================================================================
# # QUẢN LÝ PHÒNG HỌC & KIỂM TRA LỊCH
# # =========================================================================
# @router.get("/classrooms", summary="Get Classrooms List")
# def list_classrooms(
#     skip: int = Query(0, description="Default value : 0"),
#     limit: int = Query(100, description="Default value : 100"),
#     campus: Optional[str] = Query(None, description="Lọc theo cơ sở"),
#     db: Session = Depends(get_db)
# ):
#     """
#     Lấy danh sách tất cả phòng học trong hệ thống.
#     Hỗ trợ phân trang bằng tham số `skip` và `limit`. Có thể lọc danh sách theo tên cơ sở (campus).
#     """
#     query = db.query(Classroom)
#     if campus:
#         # query = query.filter(Classroom.campus == campus.strip())
#         pass
        
#     rooms = query.offset(skip).limit(limit).all()
#     return {
#         "status": "success",
#         "total": len(rooms),
#         "data": [{"room_id": r.room_id} for r in rooms]
#     }

# @router.get("/classrooms/available", summary="Get Available Classrooms")
# def get_available_classrooms(
#     session_date: str = Query(..., description="Ngày học (YYYY-MM-DD)"),
#     start_time: str = Query(..., description="Giờ bắt đầu (HH:MM:SS)"),
#     end_time: str = Query(..., description="Giờ kết thúc (HH:MM:SS)"),
#     min_capacity: Optional[int] = Query(None, description="Sức chứa tối thiểu của phòng"),
#     db: Session = Depends(get_db)
# ):
#     """
#     Tìm kiếm các phòng học trống trong một khung giờ cụ thể.
#     Hệ thống sẽ quét các lịch học đã có và tự động loại trừ những phòng đang có người sử dụng.
#     Dùng để đổ dữ liệu vào dropdown chọn phòng khi xếp lịch thủ công.
#     """
#     try:
#         dt_date = datetime.strptime(session_date.strip(), "%Y-%m-%d").date()
#         dt_start = datetime.strptime(start_time.strip(), "%H:%M:%S").time()
#         dt_end = datetime.strptime(end_time.strip(), "%H:%M:%S").time()
#         start_datetime = datetime.combine(dt_date, dt_start)
#         end_datetime = datetime.combine(dt_date, dt_end)
#     except ValueError:
#         raise HTTPException(status_code=422, detail="Định dạng ngày/giờ không hợp lệ. Vui lòng dùng YYYY-MM-DD và HH:MM:SS")

#     busy_sessions = db.query(ClassSession.room_id).filter(
#         ClassSession.session_date == dt_date,
#         ClassSession.start_time < end_datetime,
#         ClassSession.end_time > start_datetime
#     ).all()
#     busy_room_ids = [s[0] for s in busy_sessions]

#     query = db.query(Classroom).filter(~Classroom.room_id.in_(busy_room_ids))
#     available_rooms = query.all()
    
#     return {"status": "success", "data": [{"room_id": r.room_id} for r in available_rooms]}

# @router.post("/schedules/check-conflict", summary="Check Schedule Conflict")
# def check_schedule_conflict(req: CheckConflictRequest, db: Session = Depends(get_db)):
#     """
#     Kiểm tra xung đột lịch học (Check conflict).
#     Sử dụng API này trước khi chốt lưu một buổi học để đảm bảo:
#     - Phòng học chưa có lớp nào khác đăng ký.
#     - Giảng viên không bị trùng lịch dạy ở một phòng khác trong cùng khung giờ.
#     """
#     try:
#         dt_date = datetime.strptime(req.session_date.strip(), "%Y-%m-%d").date()
#         dt_start = datetime.strptime(req.start_time.strip(), "%H:%M:%S").time()
#         dt_end = datetime.strptime(req.end_time.strip(), "%H:%M:%S").time()
#         start_dt = datetime.combine(dt_date, dt_start)
#         end_dt = datetime.combine(dt_date, dt_end)
#     except ValueError:
#         raise HTTPException(status_code=422, detail="Định dạng ngày/giờ không hợp lệ.")

#     room_conflict = db.query(ClassSession).filter(
#         ClassSession.room_id == req.room_id, ClassSession.session_date == dt_date,
#         ClassSession.start_time < end_dt, ClassSession.end_time > start_dt
#     ).first()

#     if room_conflict:
#         return {
#             "is_conflict": True, "conflict_type": "ROOM",
#             "message": f"Phòng {req.room_id} đã được sử dụng bởi lớp {room_conflict.class_id} từ {room_conflict.start_time.strftime('%H:%M')} đến {room_conflict.end_time.strftime('%H:%M')}."
#         }

#     if req.lecturer_id:
#         lecturer_conflict = db.query(ClassSession).join(CreditClass).filter(
#             CreditClass.lecturer_id == req.lecturer_id, ClassSession.session_date == dt_date,
#             ClassSession.start_time < end_dt, ClassSession.end_time > start_dt
#         ).first()

#         if lecturer_conflict:
#             return {
#                 "is_conflict": True, "conflict_type": "LECTURER",
#                 "message": f"Giảng viên {req.lecturer_id} đang có lịch dạy lớp {lecturer_conflict.class_id} cùng khung giờ."
#             }

#     return {"is_conflict": False, "message": "Lịch học khả dụng."}

# @router.post("/schedules/auto-suggest", summary="Auto Suggest Schedule")
# def auto_suggest_schedule(req: AutoSuggestRequest, db: Session = Depends(get_db)):
#     """
#     Tự động đề xuất lịch học.
#     Hệ thống sẽ dựa vào ngày muốn xếp, quét các phòng học còn trống trong các ca (Sáng/Chiều),
#     loại trừ lịch bận của giảng viên phụ trách và đưa ra những gợi ý phù hợp nhất.
#     """
#     cc = db.query(CreditClass).filter(CreditClass.class_id == req.credit_class_id).first()
#     if not cc: raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ.")
        
#     try: dt_date = datetime.strptime(req.session_date.strip(), "%Y-%m-%d").date()
#     except ValueError: raise HTTPException(status_code=422, detail="Định dạng ngày không hợp lệ.")

#     suggestions = []
#     test_shifts = [
#         {"shift": 1, "start": "07:00:00", "end": "10:00:00", "label": "Ca Sáng"},
#         {"shift": 2, "start": "13:00:00", "end": "16:00:00", "label": "Ca Chiều"}
#     ]

#     for ts in test_shifts:
#         start_time = datetime.strptime(ts["start"], "%H:%M:%S").time()
#         end_time = datetime.strptime(ts["end"], "%H:%M:%S").time()
#         start_dt = datetime.combine(dt_date, start_time)
#         end_dt = datetime.combine(dt_date, end_time)

#         busy_rooms = db.query(ClassSession.room_id).filter(
#             ClassSession.session_date == dt_date,
#             ClassSession.start_time < end_dt, ClassSession.end_time > start_dt
#         ).all()
#         busy_room_ids = [r[0] for r in busy_rooms]

#         lecturer_busy = False
#         if cc.lecturer_id:
#             lecturer_conflict = db.query(ClassSession).join(CreditClass).filter(
#                 CreditClass.lecturer_id == cc.lecturer_id, ClassSession.session_date == dt_date,
#                 ClassSession.start_time < end_dt, ClassSession.end_time > start_dt
#             ).first()
#             if lecturer_conflict: lecturer_busy = True

#         if lecturer_busy: continue 

#         room = db.query(Classroom).filter(~Classroom.room_id.in_(busy_room_ids)).first()
#         if room:
#             suggestions.append({
#                 "room_id": room.room_id, "session_date": req.session_date,
#                 "shift": ts["shift"], "start_time": ts["start"], "end_time": ts["end"],
#                 "note": f"Đề xuất {ts['label']} - Phòng trống, GV rảnh"
#             })

#     if not suggestions:
#         return {"status": "failed", "message": "Không tìm thấy phòng trống hoặc giảng viên bị kẹt lịch trong ngày này."}
#     return {"status": "success", "data": suggestions}

# # =========================================================================
# # API TẠO LỚP TỰ ĐỘNG
# # =========================================================================
# @router.post("/credit-classes/preview-groups", summary="Preview Auto Generate Classes")
# def preview_auto_generate_classes(req: AutoGenerateRequest):
#     """
#     Tính toán và trả về bản xem trước (preview) của các nhóm lớp học dựa trên số lượng sinh viên dự kiến.
#     Hệ thống sẽ tự động tính ra số lượng Nhóm Lý thuyết và các Tổ Thực hành trực thuộc (dựa trên sức chứa tối đa).
#     Lưu ý: API này chỉ trả về data chứ chưa lưu vào Database.
#     """
#     num_theory_groups = math.ceil(req.total_students / req.max_theory_capacity)
#     students_per_theory = req.total_students // num_theory_groups
#     remainder_theory = req.total_students % num_theory_groups

#     preview_result = []
#     for i in range(num_theory_groups):
#         t_students = students_per_theory + (1 if i < remainder_theory else 0)
#         theory_draft = {
#             "class_group": f"{i+1:02d}", "max_students": t_students,
#             "class_type": "Theory", "sub_groups": []
#         }

#         num_practice_groups = math.ceil(t_students / req.max_practice_capacity)
#         students_per_practice = t_students // num_practice_groups
#         remainder_practice = t_students % num_practice_groups

#         for j in range(num_practice_groups):
#             p_students = students_per_practice + (1 if j < remainder_practice else 0)
#             theory_draft["sub_groups"].append({
#                 "class_group": f"Tổ {j+1}", "max_students": p_students, "class_type": "Practice"
#             })
            
#         preview_result.append(theory_draft)

#     return {
#         "status": "success",
#         "message": f"Dự kiến tạo {num_theory_groups} Nhóm LT và tổng cộng {sum(len(g['sub_groups']) for g in preview_result)} Tổ TH.",
#         "data": preview_result
#     }

# @router.post("/credit-classes/batch", summary="Save Generated Classes")
# def save_generated_classes(req: SaveDraftRequest, db: Session = Depends(get_db)):
#     """
#     Nhận dữ liệu từ bản xem trước (preview) sau khi Admin đã chỉnh sửa và tiến hành lưu hàng loạt vào cơ sở dữ liệu.
#     Tự động tạo ra các record lớp Lý thuyết, tạo lớp Thực hành gắn với lớp cha (parent_class_id) và thiết lập ánh xạ lớp biên chế.
#     """
#     saved_classes = []
#     for t_group in req.groups:
#         t_grp = 1
#         if t_group.class_group and str(t_group.class_group).isdigit(): t_grp = int(t_group.class_group)

#         t_id = f"{req.subject_id.strip()}_{req.semester_id.replace('-', '').replace('_', '')}_N{t_grp:02d}"
        
#         new_theory = CreditClass(
#             class_id=t_id, subject_id=req.subject_id, lecturer_id=req.lecturer_id,
#             semester_id=req.semester_id, class_type="Theory" if t_group.sub_groups else "Combined",
#             group_number=t_grp, sub_group_number=None, max_students=t_group.max_students, status="Planning"
#         )
#         db.add(new_theory)
#         db.flush() 
#         saved_classes.append(t_id)

#         if hasattr(t_group, 'target_classes') and t_group.target_classes:
#             for admin_class_id in t_group.target_classes:
#                 db.add(ExpectedClassMapping(credit_class_id=t_id, admin_class_id=admin_class_id))

#         for j, p_group in enumerate(t_group.sub_groups):
#             p_grp = int(p_group.class_group) if (p_group.class_group and str(p_group.class_group).isdigit()) else (j + 1)
#             p_id = f"{t_id}_T{p_grp:02d}"
            
#             new_practice = CreditClass(
#                 class_id=p_id, parent_class_id=t_id, subject_id=req.subject_id, lecturer_id=req.lecturer_id,
#                 semester_id=req.semester_id, class_type="Practice", group_number=t_grp,
#                 sub_group_number=p_grp, max_students=p_group.max_students, status="Planning"
#             )
#             db.add(new_practice)
#             saved_classes.append(p_id)

#             if hasattr(t_group, 'target_classes') and t_group.target_classes:
#                 for admin_class_id in t_group.target_classes:
#                     db.add(ExpectedClassMapping(credit_class_id=p_id, admin_class_id=admin_class_id))

#     db.commit()
#     return {"status": "success", "message": "Thành công", "saved_ids": saved_classes}


# # =========================================================================
# # QUẢN LÝ LỚP TÍN CHỈ (THÊM, SỬA, XÓA, LẤY DANH SÁCH)
# # =========================================================================
# @router.post("/credit-classes", status_code=status.HTTP_201_CREATED, summary="Add Credit Class")
# def add_credit_class(data: CreditClassCreate, db: Session = Depends(get_db)):
#     """
#     Tạo mới một lớp tín chỉ đơn lẻ (thủ công).
#     - Có kiểm tra sự tồn tại của Môn học và Giảng viên.
#     - Nếu không cung cấp `class_id`, hệ thống sẽ tự động sinh mã dạng (Mã Môn + Học kỳ + Ký tự ngẫu nhiên).
#     - Hỗ trợ lưu trữ ánh xạ đối tượng với danh sách các lớp hành chính (target_classes).
#     """
#     if not db.query(Subject).filter(Subject.subject_id == data.subject_id.strip()).first():
#         raise HTTPException(status_code=404, detail=f"Không tìm thấy môn học: {data.subject_id}")
        
#     if data.lecturer_id:
#         if not db.query(Lecturer).filter(Lecturer.lecturer_id == data.lecturer_id.strip()).first():
#             raise HTTPException(status_code=404, detail=f"Không tìm thấy giảng viên: {data.lecturer_id}")

#     if data.class_id:
#         generated_class_id = data.class_id.strip()
#         if db.query(CreditClass).filter(CreditClass.class_id == generated_class_id).first():
#             raise HTTPException(status_code=400, detail=f"Mã lớp tín chỉ '{generated_class_id}' đã tồn tại.")
#     else:
#         random_suffix = str(uuid.uuid4()).split("-")[0][:6].upper()
#         generated_class_id = f"{data.subject_id.strip()}_{data.semester_id}_{random_suffix}"
#         while db.query(CreditClass).filter(CreditClass.class_id == generated_class_id).first():
#             random_suffix = str(uuid.uuid4()).split("-")[0][:6].upper()
#             generated_class_id = f"{data.subject_id.strip()}_{data.semester_id}_{random_suffix}"

#     new_cc = CreditClass(
#         class_id=generated_class_id, parent_class_id=data.parent_class_id, subject_id=data.subject_id.strip(),
#         lecturer_id=data.lecturer_id.strip() if data.lecturer_id else None, semester_id=data.semester_id,
#         class_group=data.class_group.strip() if data.class_group else None, class_type=data.class_type,
#         start_week=data.start_week, end_week=data.end_week, max_students=data.max_students, status=data.status
#     )
#     db.add(new_cc)
    
#     if data.target_classes:
#         for admin_class_id in data.target_classes:
#             db.add(ExpectedClassMapping(credit_class_id=generated_class_id, admin_class_id=admin_class_id.strip()))

#     try:
#         db.commit()
#         db.refresh(new_cc)
#     except IntegrityError:
#         db.rollback()
#         raise HTTPException(status_code=400, detail="Lỗi lưu trữ: Kỳ học hoặc Mã lớp hành chính không hợp lệ.")
    
#     return {"status": "success", "message": "Tạo lớp tín chỉ thành công!", "data": {"class_id": generated_class_id}}

# @router.get("/credit-classes", summary="List Credit Classes")
# def list_credit_classes(
#     semester_id: Optional[str] = Query(None, description="Lọc theo mã học kỳ"),
#     subject_id: Optional[str] = Query(None, description="Lọc theo mã môn học"),
#     lecturer_id: Optional[str] = Query(None, description="Lọc theo mã giảng viên"),
#     status: Optional[str] = Query(None, description="Lọc theo trạng thái (Planning, Active...)"),
#     administrative_class_id: Optional[str] = Query(None, description="Lọc các lớp TC dành cho 1 lớp biên chế cụ thể"), 
#     major_id: Optional[str] = Query(None, description="Lọc theo mã ngành học"),
#     db: Session = Depends(get_db)
# ):
#     """
#     Lấy danh sách các lớp học tín chỉ.
#     Hỗ trợ tìm kiếm, lọc dữ liệu đa điều kiện kết hợp (Học kỳ, môn, giảng viên, trạng thái, ngành học, lớp biên chế).
#     Cấu trúc trả về bao gồm thông tin môn học, số lượng sinh viên hiện tại và tên giảng viên liên kết.
#     """
#     query = db.query(CreditClass).options(
#         joinedload(CreditClass.subject), joinedload(CreditClass.lecturer), joinedload(CreditClass.expected_mappings)
#     )

#     if semester_id: query = query.filter(CreditClass.semester_id == semester_id.strip())
#     if subject_id: query = query.filter(CreditClass.subject_id == subject_id.strip())
#     if lecturer_id: query = query.filter(CreditClass.lecturer_id == lecturer_id.strip())
#     if status: query = query.filter(CreditClass.status == status.strip())
#     if administrative_class_id: query = query.join(ExpectedClassMapping).filter(ExpectedClassMapping.admin_class_id == administrative_class_id.strip())
#     if major_id: query = query.join(Subject).filter(Subject.major_id == major_id.strip())

#     classes = list(dict.fromkeys(query.all()))
#     result = []
    
#     for c in classes:
#         target_classes = [t.admin_class_id for t in c.expected_mappings]
#         subj = c.subject
#         subject_name = subj.subject_name if subj else None
#         total_credits = subj.credits or (subj.theory_credits + subj.practical_credits) or 0 if subj else 0
        
#         result.append({
#             "class_id": c.class_id, "parent_class_id": c.parent_class_id, "subject_id": c.subject_id,
#             "subject_name": subject_name, "credits": total_credits, "lecturer_id": c.lecturer_id,
#             "lecturer_name": c.lecturer.full_name if c.lecturer else None, "semester_id": c.semester_id,
#             "class_group": format_class_group(c), "group_number": c.group_number, "sub_group_number": c.sub_group_number,
#             "class_type": c.class_type, "start_week": c.start_week, "end_week": c.end_week,
#             "max_students": c.max_students, "current_students": c.current_students, "status": c.status,
#             "target_classes": target_classes
#         })
#     return {"status": "success", "total": len(result), "data": result}

# @router.put("/credit-classes/bulk-status", summary="Update Bulk Status")
# def update_bulk_status(req: BulkStatusUpdate, db: Session = Depends(get_db)):
#     """
#     Cập nhật trạng thái cho nhiều lớp tín chỉ cùng một lúc.
#     Thường được sử dụng để mở đăng ký hàng loạt (Chuyển trạng thái từ Planning sang Active).
#     """
#     if not req.class_ids: raise HTTPException(status_code=400, detail="Không có lớp nào được chọn")
#     db.query(CreditClass).filter(CreditClass.class_id.in_(req.class_ids)).update({"status": req.status}, synchronize_session=False)
#     db.commit()
#     return {"status": "success", "message": f"Đã cập nhật trạng thái {req.status} cho {len(req.class_ids)} lớp."}

# # ==========================================
# # CÁC API DANH MỤC THÔNG DỤNG
# # ==========================================
# @router.get("/majors-list", summary="Get Majors List")
# def get_majors_list(db: Session = Depends(get_db)):
#     """
#     Lấy danh sách tất cả các Ngành học hiện có trên hệ thống để phục vụ đổ dữ liệu bộ lọc.
#     """
#     from app.models.major import Major 
#     majors = db.query(Major).all()
#     return {"status": "success", "data": [{"major_id": m.major_id, "major_name": m.major_name} for m in majors]}

# @router.get("/administrative-classes", summary="Get All Admin Classes")
# def get_all_admin_classes(db: Session = Depends(get_db)):
#     """
#     Lấy danh sách toàn bộ Lớp hành chính (lớp biên chế cố định của sinh viên).
#     Dùng để chọn danh sách đích ngắm khi tạo lớp tín chỉ.
#     """
#     classes = db.query(AdministrativeClass).all()
#     return {"status": "success", "data": [{"class_id": c.class_id, "class_name": c.class_name} for c in classes]}

# @router.get("/semesters", summary="Get Semesters")
# def get_semesters(db: Session = Depends(get_db)):
#     """
#     Lấy danh sách các Học kỳ. Danh sách mặc định được sắp xếp giảm dần theo ngày bắt đầu (học kỳ mới nhất ở trên cùng).
#     """
#     semesters = db.query(Semester).order_by(Semester.start_date.desc()).all()
#     return {"status": "success", "data": [{"semester_id": s.semester_id, "semester": s.semester_number, "academic_year": s.academic_year} for s in semesters]}

# # ==========================================
# # LẤY CHI TIẾT & SỬA / XÓA LỚP TÍN CHỈ
# # ==========================================
# @router.get("/credit-classes/{class_id}", summary="Get Credit Class Detail")
# def get_credit_class_detail(class_id: str, db: Session = Depends(get_db)):
#     """
#     Lấy thông tin cấu hình chi tiết của một lớp học tín chỉ dựa trên ID.
#     Bao gồm thông tin môn, giảng viên và sĩ số chi tiết.
#     """
#     cc = db.query(CreditClass).options(
#         joinedload(CreditClass.subject), joinedload(CreditClass.lecturer),
#         joinedload(CreditClass.expected_mappings), joinedload(CreditClass.enrollments)
#     ).filter(CreditClass.class_id == class_id.strip()).first()
    
#     if not cc: raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ này.")
        
#     target_classes = [t.admin_class_id for t in cc.expected_mappings]
#     subj = cc.subject
#     total_credits = subj.credits or (subj.theory_credits + subj.practical_credits) or 0 if subj else 0

#     c_dict = {
#         "class_id": cc.class_id, "parent_class_id": cc.parent_class_id, "subject_id": cc.subject_id,
#         "subject_name": cc.subject.subject_name if cc.subject else None, "credits": total_credits,
#         "lecturer_id": cc.lecturer_id, "lecturer_name": cc.lecturer.full_name if cc.lecturer else None,
#         "semester_id": cc.semester_id, "class_group": format_class_group(cc), "group_number": cc.group_number,          
#         "sub_group_number": cc.sub_group_number, "class_type": cc.class_type, "start_week": cc.start_week,
#         "end_week": cc.end_week, "max_students": cc.max_students, "current_students": cc.current_students,
#         "status": cc.status, "target_classes": target_classes
#     }
#     return {"status": "success", "data": c_dict}

# @router.put("/credit-classes/{class_id}", summary="Update Credit Class")
# def update_credit_class(class_id: str, data: CreditClassUpdate, db: Session = Depends(get_db)):
#     """
#     Cập nhật các thông số của một lớp học tín chỉ (Thay giảng viên, thay giới hạn sinh viên, học kỳ...).
#     Có kiểm tra an toàn: Không cho phép giảm sĩ số tối đa xuống thấp hơn số sinh viên hiện đang theo học.
#     """
#     cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
#     if not cc: raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ.")

#     if data.lecturer_id:
#         if not db.query(Lecturer).filter(Lecturer.lecturer_id == data.lecturer_id.strip()).first():
#             raise HTTPException(status_code=404, detail=f"Không tìm thấy giảng viên {data.lecturer_id}")
#         cc.lecturer_id = data.lecturer_id.strip()

#     if data.semester_id: cc.semester_id = data.semester_id.strip()
#     if data.class_group is not None: cc.class_group = data.class_group.strip() if data.class_group.strip() else None
#     if data.class_type is not None: cc.class_type = data.class_type.strip()
#     if data.start_week is not None: cc.start_week = data.start_week
#     if data.end_week is not None: cc.end_week = data.end_week

#     if data.max_students is not None:
#         if data.max_students < cc.current_students:
#             raise HTTPException(status_code=400, detail=f"Lớp đang có {cc.current_students} SV, không thể giảm xuống {data.max_students}.")
#         cc.max_students = data.max_students

#     if data.status: cc.status = data.status.strip()

#     if data.target_classes is not None:
#         db.query(ExpectedClassMapping).filter(ExpectedClassMapping.credit_class_id == cc.class_id).delete()
#         for admin_class_id in data.target_classes:
#             db.add(ExpectedClassMapping(credit_class_id=cc.class_id, admin_class_id=admin_class_id.strip()))

#     db.commit()
#     db.refresh(cc)
    
#     return {"status": "success", "message": f"Đã cập nhật thành công lớp {cc.class_id}", "data": {"class_id": cc.class_id, "status": cc.status}}

# @router.delete("/credit-classes/{class_id}", summary="Delete Credit Class")
# def delete_credit_class(class_id: str, db: Session = Depends(get_db)):
#     """
#     Xóa một lớp tín chỉ ra khỏi hệ thống.
#     Quy tắc an toàn: Từ chối yêu cầu xóa nếu lớp học đang có sinh viên đăng ký (current_students > 0).
#     """
#     cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
#     if not cc: raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ.")
#     if cc.current_students > 0: raise HTTPException(status_code=400, detail=f"Không thể xóa! Lớp này đang có {cc.current_students} sinh viên.")

#     db.delete(cc)
#     db.commit()
#     return {"status": "success", "message": f"Đã xóa lớp tín chỉ {class_id} thành công."}

# # =========================================================================
# # QUẢN LÝ SINH VIÊN & ĐĂNG KÝ MÔN HỌC
# # =========================================================================
# @router.get("/credit-classes/{class_id}/students", summary="Get Students In Class")
# def get_students_in_class(class_id: str, db: Session = Depends(get_db)):
#     """
#     Lấy danh sách tất cả các sinh viên hiện đang theo học (enrolled) trong một lớp tín chỉ cụ thể.
#     """
#     cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
#     if not cc: raise HTTPException(status_code=404, detail="Không tìm thấy lớp học tín chỉ.")

#     enrollments = db.query(ClassEnrollment).filter(ClassEnrollment.class_id == class_id.strip()).all()
#     student_list = []
#     for enr in enrollments:
#         if enr.student:
#             student_list.append({
#                 "student_id": enr.student.student_id,
#                 "full_name": enr.student.profile.full_name if getattr(enr.student, 'profile', None) else "N/A",
#                 "administrative_class": enr.student.administrative_class,
#                 "enrollment_date": enr.updated_at.isoformat() if enr.updated_at else (enr.enrollment_date.isoformat() if enr.enrollment_date else None)
#             })
#     return {"status": "success", "class_id": class_id, "total_students": len(student_list), "data": student_list}

# @router.post("/credit-classes/{class_id}/enrollments", summary="Enroll Student")
# def enroll_student(class_id: str, student_id: str = Form(...), db: Session = Depends(get_db)):
#     """
#     Đăng ký môn học cho một sinh viên.
#     Tính năng tự động hóa cực mạnh:
#     - Kiểm tra trạng thái đóng/mở của lớp.
#     - Kiểm tra giới hạn sĩ số sinh viên.
#     - Tự động đăng ký đính kèm lớp cha nếu sinh viên chọn lớp Thực hành.
#     - Kiểm tra xung đột (trùng lịch) với các thời khóa biểu hiện có của sinh viên đó.
#     """
#     cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
#     if not cc: raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp {class_id}")
#     if (cc.status or "").lower() != "active": raise HTTPException(status_code=400, detail=f"Lớp {class_id} không mở để đăng ký.")
    
#     st = db.query(Student).filter(Student.student_id == student_id.strip().upper()).first()
#     if not st: raise HTTPException(status_code=404, detail=f"Không tìm thấy sinh viên {student_id}")
        
#     classes_to_enroll = [cc]
#     if cc.class_type == "Practice" and cc.parent_class_id:
#         parent_cc = db.query(CreditClass).filter(CreditClass.class_id == cc.parent_class_id).first()
#         if parent_cc: classes_to_enroll.append(parent_cc)

#     enrolled_class_ids_query = db.query(ClassEnrollment.class_id).filter(ClassEnrollment.student_id == student_id.strip().upper())
#     enrolled_class_ids = [r[0] for r in enrolled_class_ids_query.all()]

#     new_enroll_ids = []
#     for c_enroll in classes_to_enroll:
#         if c_enroll.class_id in enrolled_class_ids: continue 
#         if c_enroll.current_students >= c_enroll.max_students:
#              raise HTTPException(status_code=400, detail=f"Lớp {c_enroll.class_id} đã đạt giới hạn sĩ số.")
#         new_enroll_ids.append(c_enroll.class_id)

#     if not new_enroll_ids: return {"status": "success", "message": "Sinh viên đã đăng ký các lớp này rồi."}

#     new_sessions = db.query(ClassSchedule).filter(ClassSchedule.class_id.in_(new_enroll_ids)).all()
#     if new_sessions and enrolled_class_ids:
#         enrolled_sessions = db.query(ClassSchedule).filter(ClassSchedule.class_id.in_(enrolled_class_ids)).all()
#         for ns in new_sessions:
#             for es in enrolled_sessions:
#                 if ns.start_time < es.end_time and ns.end_time > es.start_time:
#                     raise HTTPException(status_code=400, detail=f"Trùng lịch học! Lớp {ns.class_id} bị trùng với {es.class_id}.")

#     for c_id in new_enroll_ids:
#         enroll = ClassEnrollment(
#             class_id=c_id, student_id=student_id.strip().upper(),
#             enrollment_date=datetime.now(), updated_at=datetime.now(), status="Enrolled"
#         )
#         db.add(enroll)
        
#     db.commit()
#     return {"status": "success", "message": f"Đã đăng ký thành công: {', '.join(new_enroll_ids)}"}

# @router.delete("/credit-classes/{class_id}/enrollments/{student_id}", summary="Unenroll Student")
# def unenroll_student(class_id: str, student_id: str, db: Session = Depends(get_db)):
#     """
#     Hủy đăng ký học phần của sinh viên.
#     Quy tắc hủy chuỗi (Cascading):
#     - Nếu hủy lớp Thực hành, hệ thống sẽ tự động hủy kèm lớp Lý thuyết (nếu có).
#     - Nếu hủy lớp Lý thuyết, hệ thống tự động dò tìm các tổ Thực hành con mà sinh viên đang học và hủy chung.
#     """
#     cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
#     if not cc: raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp học tín chỉ {class_id}.")
#     if cc.status.lower() != "active": raise HTTPException(status_code=400, detail=f"Lớp {class_id} không mở, không thể hủy đăng ký.")
    
#     classes_to_unenroll = [class_id.strip()]
#     if cc.class_type == "Practice" and cc.parent_class_id:
#         classes_to_unenroll.append(cc.parent_class_id)
#     elif cc.class_type == "Theory":
#         child_classes = db.query(CreditClass.class_id).filter(CreditClass.parent_class_id == class_id.strip()).all()
#         child_class_ids = [c[0] for c in child_classes]
#         if child_class_ids: classes_to_unenroll.extend(child_class_ids)

#     enrollments = db.query(ClassEnrollment).filter(
#         ClassEnrollment.class_id.in_(classes_to_unenroll), 
#         ClassEnrollment.student_id == student_id.strip().upper()
#     ).all()
    
#     if not enrollments: raise HTTPException(status_code=404, detail="Không tìm thấy thông tin đăng ký học.")
    
#     for e in enrollments: db.delete(e)
#     db.commit()
#     deleted_ids = [e.class_id for e in enrollments]
#     return {"status": "success", "message": f"Đã hủy đăng ký thành công: {', '.join(deleted_ids)}"}

# # =========================================================================
# # QUẢN LÝ LỊCH HỌC (SESSIONS) 
# # =========================================================================
# @router.post("/schedules", summary="Add Schedule Session")
# def add_schedule(
#     class_id: str = Form(..., alias="ma_lop_tc"),
#     session_date: str = Form(..., alias="ngay_hoc"), 
#     room_id: str = Form(..., alias="phong_hoc"),
#     start_time: str = Form(..., alias="gio_bat_dau"),
#     shift: int = Form(1, alias="ca_hoc"),
#     db: Session = Depends(get_db)
# ):
#     """
#     Thêm một buổi học (session) thủ công vào danh sách lịch học của lớp tín chỉ.
#     Có tích hợp cơ chế kiểm tra (Check Conflict) trực tiếp tại bước lưu, đảm bảo phòng học không bị đụng ca.
#     """
#     cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
#     if not cc: raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp tín chỉ {class_id}")
        
#     room = db.query(Classroom).filter(Classroom.room_id == room_id.strip()).first()
#     if not room: raise HTTPException(status_code=400, detail=f"Không tìm thấy phòng học {room_id}.")
        
#     try:
#         dt_date = datetime.strptime(session_date.strip(), "%Y-%m-%d").date()
#         time_str = start_time.strip() if len(start_time.strip()) == 8 else start_time.strip() + ":00"
#         dt_time = datetime.strptime(time_str, "%H:%M:%S").time()
#         dt_start = datetime.combine(dt_date, dt_time)
#         dt_end = dt_start + timedelta(hours=3)
#     except Exception as e:
#         raise HTTPException(status_code=400, detail=f"Định dạng ngày giờ không hợp lệ: {e}")

#     room_conflicts = db.query(ClassSession).filter(ClassSession.room_id == room_id.strip()).all()
#     for c in room_conflicts:
#         if dt_start < c.end_time and dt_end > c.start_time:
#             conflict_time_str = c.start_time.strftime("%H:%M")
#             raise HTTPException(status_code=400, detail=f"Trùng lịch: Phòng {room_id} đã có lớp {c.class_id} học lúc {conflict_time_str}.")

#     sched = ClassSession(
#         class_id=class_id.strip(), room_id=room_id.strip(), session_date=dt_date,
#         shift=shift, start_time=dt_start, end_time=dt_end
#     )
#     db.add(sched)
#     db.commit()
#     return {"status": "success", "message": f"Đã thêm lịch học cho lớp {class_id} tại phòng {room_id}"}


# @router.get("/schedules", summary="List Schedules")
# def list_schedules(lecturer_id: Optional[str] = Query(None, description="Lọc thời khóa biểu theo giảng viên"), db: Session = Depends(get_db)):
#     """
#     Lấy danh sách tất cả các lịch học (Sessions).
#     Có thể sử dụng tham số query `lecturer_id` để trích xuất thời khóa biểu cá nhân của một giảng viên.
#     """
#     try:
#         query = db.query(ClassSession)
#         if lecturer_id:
#             query = query.join(CreditClass).filter(CreditClass.lecturer_id == lecturer_id.strip())
#         schedules = query.all()
#         return {
#             "status": "success",
#             "schedules": [
#                 {
#                     "session_id": s.session_id, "class_id": s.class_id, "session_date": str(s.session_date),
#                     "room_id": s.room_id, "start_time": str(s.start_time.strftime("%H:%M") if hasattr(s.start_time, 'strftime') else s.start_time),
#                     "end_time": str(s.end_time), "shift": getattr(s, 'shift', 1),
#                     "loai_lich": getattr(s, 'loai_lich', 'Lý thuyết'), 
#                     "subject_name": s.credit_class.subject.subject_name if (s.credit_class and s.credit_class.subject) else "N/A"
#                 }
#                 for s in schedules
#             ]
#         }
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")

# # =========================================================================
# # API ĐIỂM DANH (ATTENDANCE)
# # =========================================================================
# @router.get("/credit-classes/{class_id}/attendance/report", summary="Get Class Attendance Report")
# def get_class_attendance_report(class_id: str, db: Session = Depends(get_db)):
#     """
#     Xuất báo cáo điểm danh chi tiết cho một lớp tín chỉ.
#     Báo cáo cung cấp số liệu tổng quan về từng sinh viên: Số buổi đi muộn, Vắng không phép, Vắng có phép,
#     Điểm chuyên cần dự kiến, và cảnh báo trạng thái 'Cấm thi' nếu tỷ lệ nghỉ vượt quá 20%.
#     """
#     try:
#         schedules = db.query(ClassSession).filter(ClassSession.class_id == class_id.strip()).all()
#         session_ids = [s.session_id for s in schedules]
#         total_sessions = len(schedules)
        
#         enrollments = db.query(ClassEnrollment).filter(ClassEnrollment.class_id == class_id.strip()).all()
#         report = []
        
#         for e in enrollments:
#             student = e.student
#             if not student: continue
                
#             di_muon = 0; vang_kp = 0; co_phep = 0
            
#             if total_sessions > 0:
#                 attendance_records = db.query(AttendanceRecord).filter(
#                     AttendanceRecord.student_id == student.student_id,
#                     AttendanceRecord.session_id.in_(session_ids)
#                 ).all()
                
#                 attended_session_ids = set()
#                 for record in attendance_records:
#                     attended_session_ids.add(record.session_id)
#                     if record.status == "Late": di_muon += 1
#                     elif record.status == "Excused": co_phep += 1
#                     elif record.status == "Absent": vang_kp += 1
                
#                 now = datetime.now()
#                 for s in schedules:
#                     if s.start_time < now and s.session_id not in attended_session_ids:
#                         vang_kp += 1
            
#             score = max(0.0, round(10.0 - (di_muon * 0.5) - (vang_kp * 1.0), 1))
#             total_absent = vang_kp + co_phep
#             ty_le_vang = round((total_absent / total_sessions) * 100, 1) if total_sessions > 0 else 0.0
            
#             report.append({
#                 "mssv": student.student_id, "ho_ten": student.profile.full_name if student.profile else "N/A",
#                 "lop_base": student.administrative_class or "N/A",
#                 "di_muon": di_muon, "vang_kp": vang_kp, "co_phep": co_phep,
#                 "score": score, "ty_le_vang": ty_le_vang,
#                 "trang_thai": "Cấm thi" if ty_le_vang > 20.0 else "Hợp lệ"
#             })
            
#         return {"status": "success", "report": report}
#     except Exception as err:
#         raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {err}")

# @router.post("/attendance/manual-checkin", summary="Teacher Manual Checkin")
# def teacher_manual_checkin(
#     mssv: str = Form(..., description="Mã số sinh viên"), 
#     session_id: int = Form(..., description="Mã ID của buổi học"), 
#     trang_thai: str = Form(..., description="Trạng thái (Present/Absent/Late/Excused)"),
#     nguoi_xac_nhan: Optional[str] = Form(None, description="Tên giảng viên hoặc Admin thực hiện"), 
#     db: Session = Depends(get_db)
# ):
#     """
#     Cho phép Giảng viên điểm danh thủ công hoặc sửa lại trạng thái điểm danh cho một sinh viên.
#     Nếu sinh viên đã có lịch sử điểm danh ở buổi học đó, hệ thống sẽ thực hiện Update, ngược lại sẽ Create mới.
#     """
#     try:
#         sched = db.query(ClassSession).filter(ClassSession.session_id == session_id).first()
#         if not sched: raise HTTPException(status_code=404, detail="Không tìm thấy buổi học.")

#         existing = db.query(AttendanceRecord).filter(
#             AttendanceRecord.student_id == mssv.strip().upper(),
#             AttendanceRecord.session_id == session_id
#         ).first()

#         if existing:
#             existing.status = trang_thai
#             existing.notes = f"Sửa bởi {nguoi_xac_nhan or 'Giảng viên'}"
#             existing.recorded_at = datetime.now()
#         else:
#             new_att = AttendanceRecord(
#                 student_id=mssv.strip().upper(), session_id=session_id, status=trang_thai,
#                 notes=f"Điểm danh bởi {nguoi_xac_nhan or 'Giảng viên'}", recorded_at=datetime.now()
#             )
#             db.add(new_att)
            
#         db.commit()
#         return {"status": "success", "message": "Cập nhật trạng thái điểm danh thủ công thành công."}
#     except Exception as e:
#         db.rollback()
#         raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")

# @router.get("/attendance", summary="Get Recent Attendance Logs")
# def get_recent_attendance_logs(db: Session = Depends(get_db)):
#     """
#     Lấy danh sách 50 bản ghi điểm danh gần nhất trên toàn hệ thống.
#     Dùng để phục vụ quản trị viên xem Log Audit thời gian thực (Real-time monitoring).
#     """
#     recent_logs = db.query(AttendanceRecord).order_by(AttendanceRecord.recorded_at.desc()).limit(50).all()
#     logs_data = []
#     for log in recent_logs:
#         logs_data.append({
#             "id": log.record_id, "mssv": log.student_id, "session_id": log.session_id,
#             "trang_thai": log.status, "recorded_at": log.recorded_at
#         })
#     return {"status": "success", "logs": logs_data}