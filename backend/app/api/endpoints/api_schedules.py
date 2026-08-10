# from fastapi import APIRouter, Depends, HTTPException, Form, status
# from sqlalchemy.orm import Session, joinedload
# from pydantic import BaseModel
# from datetime import date, datetime, timedelta
# from typing import Optional, List

# from app.db.session import get_db
# from app.models import (
#     CreditClass, ClassSession, Classroom, Lecturer
# )

# router = APIRouter()

# # =========================================================================
# # SCHEMAS (Định nghĩa dữ liệu đầu vào cho API)
# # =========================================================================
# class AutoScheduleRequest(BaseModel):
#     semester_id: str
#     start_date: date          # Ngày bắt đầu học kỳ (Ví dụ: Thứ 2 của tuần 1)
#     total_weeks: int = 15     # Số tuần học mặc định kéo dài
#     sessions_per_week: int = 1 # Số buổi học mỗi tuần cho 1 lớp

# # Định nghĩa các khung giờ/ca học chuẩn của trường PTIT
# SHIFTS = [
#     {"shift": 1, "start_time": "07:00:00", "end_time": "09:30:00"}, # Ca 1 (Sáng)
#     {"shift": 2, "start_time": "09:30:00", "end_time": "12:00:00"}, # Ca 2 (Sáng)
#     {"shift": 3, "start_time": "13:00:00", "end_time": "15:30:00"}, # Ca 3 (Chiều)
#     {"shift": 4, "start_time": "15:30:00", "end_time": "18:00:00"}, # Ca 4 (Chiều)
# ]

# # Các ngày trong tuần (0: Thứ 2, 1: Thứ 3, ..., 5: Thứ 7)
# DAYS_OF_WEEK = [0, 1, 2, 3, 4, 5]


# # =========================================================================
# # 1. API XẾP LỊCH TỰ ĐỘNG HÀNG LOẠT
# # =========================================================================
# @router.post("/auto-generate")
# def auto_generate_schedules(req: AutoScheduleRequest, db: Session = Depends(get_db)):
#     # 1. Lấy danh sách các lớp trong học kỳ CHƯA CÓ LỊCH HỌC
#     scheduled_class_ids_query = db.query(ClassSession.class_id).distinct().all()
#     scheduled_class_ids = [c[0] for c in scheduled_class_ids_query]

#     classes_to_schedule = db.query(CreditClass).filter(
#         CreditClass.semester_id == req.semester_id,
#         CreditClass.class_id.notin_(scheduled_class_ids)
#     ).all()

#     if not classes_to_schedule:
#         return {"status": "success", "message": "Tất cả các lớp trong học kỳ này đã có lịch học."}

#     # 2. Lấy toàn bộ danh sách phòng học và phân loại
#     # Sắp xếp phòng từ nhỏ đến lớn để tiết kiệm phòng to cho các lớp đông sinh viên
#     all_rooms = db.query(Classroom).order_by(Classroom.capacity.asc()).all()
    
#     # (Giả định: Mã phòng có chứa chữ "PM" hoặc "LAB" là phòng thực hành máy tính)
#     practice_rooms = [r for r in all_rooms if "PM" in r.room_id.upper() or "LAB" in r.room_id.upper()]
#     theory_rooms = [r for r in all_rooms if r not in practice_rooms]

#     success_count = 0
#     failed_classes = []

#     # 3. Tiến hành xếp lịch cho từng lớp
#     for cc in classes_to_schedule:
#         assigned = False
        
#         # Xác định loại phòng cần thiết
#         available_rooms = practice_rooms if cc.class_type == "Practice" else theory_rooms
        
#         # Ràng buộc sức chứa: Chỉ lấy những phòng chứa đủ số lượng sinh viên của lớp
#         valid_rooms = [r for r in available_rooms if r.capacity >= cc.max_students]
        
#         if not valid_rooms:
#             failed_classes.append({
#                 "class_id": cc.class_id, 
#                 "reason": f"Không có phòng {'Thực hành' if cc.class_type == 'Practice' else 'Lý thuyết'} nào đủ sức chứa {cc.max_students} SV."
#             })
#             continue

#         # Bắt đầu duyệt tìm Slot (Ngày + Ca học) trống
#         for day_offset in DAYS_OF_WEEK:
#             if assigned: break
            
#             for shift_data in SHIFTS:
#                 if assigned: break
                
#                 test_date = req.start_date + timedelta(days=day_offset)
#                 dt_time_start = datetime.strptime(shift_data["start_time"], "%H:%M:%S").time()
#                 dt_time_end = datetime.strptime(shift_data["end_time"], "%H:%M:%S").time()
#                 test_dt_start = datetime.combine(test_date, dt_time_start)
#                 test_dt_end = datetime.combine(test_date, dt_time_end)

#                 for room in valid_rooms:
#                     # Kiểm tra đụng lịch PHÒNG HỌC (chỉ cần test tuần đầu tiên)
#                     room_conflict = db.query(ClassSession).filter(
#                         ClassSession.room_id == room.room_id,
#                         ClassSession.shift == shift_data["shift"],
#                         ClassSession.session_date == test_date 
#                     ).first()

#                     if room_conflict: continue # Phòng đã có người xài -> Tìm phòng khác

#                     # Kiểm tra đụng lịch GIẢNG VIÊN
#                     if cc.lecturer_id:
#                         lecturer_conflict = db.query(ClassSession).join(CreditClass).filter(
#                             CreditClass.lecturer_id == cc.lecturer_id,
#                             ClassSession.shift == shift_data["shift"],
#                             ClassSession.session_date == test_date
#                         ).first()

#                         if lecturer_conflict: continue # Giảng viên kẹt dạy lớp khác -> Tìm ca khác

#                     # TÌM ĐƯỢC SLOT HOÀN HẢO -> Sinh lịch cho N tuần
#                     new_sessions = []
#                     for week in range(req.total_weeks):
#                         session_date = test_date + timedelta(weeks=week)
#                         session_dt_start = datetime.combine(session_date, dt_time_start)
#                         session_dt_end = datetime.combine(session_date, dt_time_end)

#                         new_session = ClassSession(
#                             class_id=cc.class_id,
#                             room_id=room.room_id,
#                             session_date=session_date,
#                             shift=shift_data["shift"],
#                             start_time=session_dt_start,
#                             end_time=session_dt_end
#                         )
#                         new_sessions.append(new_session)
                    
#                     db.add_all(new_sessions)
#                     db.commit() # Phải commit ngay để vòng lặp lớp tiếp theo nhận diện được phòng này đã bị chiếm
                    
#                     success_count += 1
#                     assigned = True
#                     break # Thoát vòng lặp phòng học

#         if not assigned:
#             failed_classes.append({
#                 "class_id": cc.class_id, 
#                 "reason": "Kẹt lịch (hết phòng trống hoặc giảng viên bị trùng giờ dạy)."
#             })

#     return {
#         "status": "success",
#         "message": f"Xếp lịch tự động hoàn tất. Thành công: {success_count} lớp. Thất bại: {len(failed_classes)} lớp.",
#         "success_count": success_count,
#         "failed_classes": failed_classes
#     }


# # =========================================================================
# # 2. API XẾP LỊCH THỦ CÔNG (Tạo 1 buổi học)
# # =========================================================================
# @router.post("")
# def add_schedule(
#     class_id: str = Form(..., alias="ma_lop_tc"),
#     session_date: str = Form(..., alias="ngay_hoc"), 
#     room_id: str = Form(..., alias="phong_hoc"),
#     start_time: str = Form(..., alias="gio_bat_dau"),
#     shift: int = Form(1, alias="ca_hoc"),
#     db: Session = Depends(get_db)
# ):
#     cc = db.query(CreditClass).filter(CreditClass.class_id == class_id.strip()).first()
#     if not cc: 
#         raise HTTPException(status_code=404, detail=f"Không tìm thấy lớp tín chỉ {class_id}")
        
#     room = db.query(Classroom).filter(Classroom.room_id == room_id.strip()).first()
#     if not room: 
#         raise HTTPException(status_code=400, detail=f"Không tìm thấy phòng học {room_id}.")
        
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
#             raise HTTPException(
#                 status_code=400, 
#                 detail=f"Trùng lịch: Phòng {room_id} đã có lớp {c.class_id} học lúc {conflict_time_str}."
#             )

#     if cc.lecturer_id:
#         lecturer_conflicts = db.query(ClassSession).join(CreditClass).filter(
#             CreditClass.lecturer_id == cc.lecturer_id,
#             ClassSession.session_date == dt_date
#         ).all()
#         for c in lecturer_conflicts:
#             if dt_start < c.end_time and dt_end > c.start_time:
#                 conflict_time_str = c.start_time.strftime("%H:%M")
#                 raise HTTPException(
#                     status_code=400, 
#                     detail=f"Trùng lịch: Giảng viên {cc.lecturer_id} đang dạy lớp {c.class_id} vào lúc {conflict_time_str}."
#                 )

#     sched = ClassSession(
#         class_id=class_id.strip(),
#         room_id=room_id.strip(),
#         session_date=dt_date,
#         shift=shift,
#         start_time=dt_start,
#         end_time=dt_end
#     )
#     db.add(sched)
#     db.commit()
    
#     return {"status": "success", "message": f"Đã thêm lịch học cho lớp {class_id} tại phòng {room_id}"}


# # =========================================================================
# # 3. API LẤY DANH SÁCH LỊCH HỌC
# # =========================================================================
# @router.get("")
# def list_schedules(lecturer_id: Optional[str] = None, db: Session = Depends(get_db)):
#     try:
#         query = db.query(ClassSession).options(
#             joinedload(ClassSession.credit_class).joinedload(CreditClass.subject)
#         )
        
#         if lecturer_id:
#             query = query.join(CreditClass).filter(CreditClass.lecturer_id == lecturer_id.strip())
            
#         schedules = query.all()
        
#         return {
#             "status": "success",
#             "schedules": [
#                 {
#                     "session_id": s.session_id,
#                     "class_id": s.class_id,
#                     "session_date": str(s.session_date),
#                     "room_id": s.room_id,
#                     "start_time": str(s.start_time),
#                     "end_time": str(s.end_time),
#                     "subject_name": s.credit_class.subject.subject_name if (s.credit_class and s.credit_class.subject) else "N/A"
#                 }
#                 for s in schedules
#             ]
#         }
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Lỗi hệ thống: {e}")




# # Schema cho request body update lịch học
# class ScheduleUpdate(BaseModel):
#     session_date: Optional[date] = None
#     room_id: Optional[str] = None
#     start_time: Optional[str] = None
#     shift: Optional[int] = None

# # =========================================================================
# # 4. API CẬP NHẬT LỊCH HỌC (Dời ngày, đổi phòng, đổi ca)
# # =========================================================================
# @router.put("/{session_id}")
# def update_schedule(session_id: int, req: ScheduleUpdate, db: Session = Depends(get_db)):
#     # 1. Tìm buổi học cần sửa
#     sched = db.query(ClassSession).filter(ClassSession.session_id == session_id).first()
#     if not sched:
#         raise HTTPException(status_code=404, detail="Không tìm thấy buổi học này.")

#     cc = db.query(CreditClass).filter(CreditClass.class_id == sched.class_id).first()

#     # 2. Gán giá trị mới (Nếu field nào không truyền lên thì giữ nguyên giá trị cũ)
#     new_date = req.session_date if req.session_date else sched.session_date
#     new_room = req.room_id.strip() if req.room_id else sched.room_id
#     new_shift = req.shift if req.shift else sched.shift

#     # Xử lý thời gian mới
#     if req.start_time:
#         time_str = req.start_time.strip() if len(req.start_time.strip()) == 8 else req.start_time.strip() + ":00"
#         dt_time = datetime.strptime(time_str, "%H:%M:%S").time()
#     else:
#         dt_time = sched.start_time.time()

#     new_start = datetime.combine(new_date, dt_time)
#     new_end = new_start + timedelta(hours=3) # Giả định ca học 3 tiếng

#     # 3. Kiểm tra Phòng học mới có tồn tại không
#     if req.room_id:
#         room = db.query(Classroom).filter(Classroom.room_id == new_room).first()
#         if not room:
#             raise HTTPException(status_code=400, detail=f"Không tìm thấy phòng học {new_room}.")
        
#         # (Tùy chọn) Kiểm tra sức chứa phòng mới
#         if cc and room.capacity < cc.max_students:
#              raise HTTPException(status_code=400, detail=f"Phòng {new_room} (sức chứa {room.capacity}) không đủ chỗ cho lớp {cc.max_students} SV.")

#     # 4. RÀNG BUỘC: Kiểm tra trùng lịch PHÒNG HỌC (LƯU Ý: Phải loại trừ chính session này ra)
#     room_conflicts = db.query(ClassSession).filter(
#         ClassSession.room_id == new_room,
#         ClassSession.session_id != session_id  # <--- BỎ QUA CHÍNH NÓ
#     ).all()
    
#     for c in room_conflicts:
#         if new_start < c.end_time and new_end > c.start_time:
#             conflict_time_str = c.start_time.strftime("%d/%m/%Y %H:%M")
#             raise HTTPException(
#                 status_code=400, 
#                 detail=f"Trùng lịch: Phòng {new_room} đã có lớp {c.class_id} học lúc {conflict_time_str}."
#             )

#     # 5. RÀNG BUỘC: Kiểm tra trùng lịch GIẢNG VIÊN (LƯU Ý: Phải loại trừ chính session này ra)
#     if cc and cc.lecturer_id:
#         lecturer_conflicts = db.query(ClassSession).join(CreditClass).filter(
#             CreditClass.lecturer_id == cc.lecturer_id,
#             ClassSession.session_date == new_date,
#             ClassSession.session_id != session_id # <--- BỎ QUA CHÍNH NÓ
#         ).all()
        
#         for c in lecturer_conflicts:
#             if new_start < c.end_time and new_end > c.start_time:
#                 conflict_time_str = c.start_time.strftime("%H:%M")
#                 raise HTTPException(
#                     status_code=400, 
#                     detail=f"Giảng viên đụng lịch: GV {cc.lecturer_id} đang dạy lớp {c.class_id} vào lúc {conflict_time_str}."
#                 )

#     # 6. Cập nhật dữ liệu
#     sched.session_date = new_date
#     sched.room_id = new_room
#     sched.shift = new_shift
#     sched.start_time = new_start
#     sched.end_time = new_end

#     db.commit()
    
#     return {
#         "status": "success", 
#         "message": f"Đã dời lịch thành công sang phòng {new_room}, ngày {new_date.strftime('%d/%m/%Y')}."
#     }