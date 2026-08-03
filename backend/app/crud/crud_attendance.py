from sqlalchemy.orm import Session
from app.models import AttendanceRecord, ClassEnrollment, ClassSession
from datetime import datetime

def generate_attendance_list(db: Session, session_id: int):
    """
    Nghiệp vụ: Khi bắt đầu tiết học, tự động lấy danh sách sinh viên đăng ký môn (ClassEnrollment)
    để nhét vào bảng AttendanceRecords với trạng thái mặc định là Absent (Vắng mặt).
    """
    session = db.query(ClassSession).filter(ClassSession.session_id == session_id).first()
    if not session:
        return False
        
    enrolled_students = db.query(ClassEnrollment).filter(ClassEnrollment.class_id == session.class_id).all()
    
    records_to_add = []
    for enrollment in enrolled_students:
        # Kiểm tra xem record đã tồn tại chưa để tránh trùng lặp
        exists = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == session_id,
            AttendanceRecord.student_id == enrollment.student_id
        ).first()
        
        if not exists:
            new_record = AttendanceRecord(
                session_id=session_id,
                student_id=enrollment.student_id,
                status="Absent" # Mặc định vắng, AI quét trúng sẽ tự động Update thành Present
            )
            records_to_add.append(new_record)
            
    if records_to_add:
        db.add_all(records_to_add)
        db.commit()
    return True

def record_attendance_ai(db: Session, session_id: int, student_id: str, confidence: float, image_url: str = None):
    """
    Nghiệp vụ AI: Camera quét được mặt -> Gọi hàm này cập nhật thời gian quét.
    Trạng thái (Present/Late) sẽ do Trigger MySQL tự động tính toán dựa vào start_time của session!
    """
    record = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.student_id == student_id
    ).first()

    if record:
        record.recorded_at = datetime.now()
        record.confidence_score = confidence
        if image_url:
            record.proof_image_url = image_url
            
        db.commit()
        db.refresh(record)
        return record
    return None

def update_attendance_manual(db: Session, record_id: int, status: str, notes: str, updated_by_account_id: int):
    """
    Nghiệp vụ Giảng viên: Điểm danh bù bằng tay hoặc sửa lỗi AI nhận diện sai.
    """
    record = db.query(AttendanceRecord).filter(AttendanceRecord.record_id == record_id).first()
    if record:
        record.status = status # Ghi đè trạng thái (VD: Excused - Có phép)
        record.notes = notes
        record.updated_by = updated_by_account_id
        db.commit()
        db.refresh(record)
    return record

def get_session_attendance(db: Session, session_id: int):
    """Lấy danh sách kết quả điểm danh của một buổi học để hiển thị lên Frontend"""
    return db.query(AttendanceRecord).filter(AttendanceRecord.session_id == session_id).all()

def get_student_attendance_history(db: Session, student_id: str, class_id: str = None):
    """Sinh viên xem lịch sử đi học của mình"""
    query = db.query(AttendanceRecord).filter(AttendanceRecord.student_id == student_id)
    if class_id:
        query = query.join(ClassSession).filter(ClassSession.class_id == class_id)
    return query.all()